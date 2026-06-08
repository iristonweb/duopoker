import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { Socket } from 'socket.io-client';
import type { TableChatMessage } from '@duopoker/shared-types/index';
import { isChatErrorCode } from '../session/table-errors';

const CHAT_RETRY_MS = 1200;

export type TableChatApiFetch = (path: string, init?: RequestInit) => Promise<Response>;

export type UseTableChatOptions = {
  /** REST long-poll for Vercel / same-origin API (no Socket.IO). */
  apiFetch?: TableChatApiFetch;
  realtime?: boolean;
};

const mergeMessages = (prev: TableChatMessage[], incoming: TableChatMessage[]) => {
  if (incoming.length === 0) return prev;
  const seen = new Set(prev.map((m) => m.id));
  const next = [...prev];
  for (const msg of incoming) {
    if (seen.has(msg.id)) continue;
    seen.add(msg.id);
    next.push(msg);
  }
  return next.slice(-100);
};

const applyIncoming = (
  incoming: TableChatMessage[],
  opts: {
    initialLoadDoneRef: MutableRefObject<boolean>;
    lastAtRef: MutableRefObject<number>;
    drawerOpenRef: MutableRefObject<boolean>;
    setMessages: (value: TableChatMessage[] | ((prev: TableChatMessage[]) => TableChatMessage[])) => void;
    setUnread: (value: number | ((prev: number) => number)) => void;
    after?: number;
  }
) => {
  if (incoming.length === 0) return;
  opts.setMessages((prev) => mergeMessages(prev, incoming));
  const last = incoming.at(-1);
  if (last) opts.lastAtRef.current = Math.max(opts.lastAtRef.current, last.at);
  const isDelta = opts.initialLoadDoneRef.current && opts.after != null && opts.after > 0;
  opts.initialLoadDoneRef.current = true;
  if (isDelta && !opts.drawerOpenRef.current) {
    opts.setUnread((n) => n + incoming.length);
  }
};

export function useTableChat(
  sessionId: string | undefined,
  socket: Socket | null,
  options?: UseTableChatOptions
) {
  const realtime = options?.realtime ?? Boolean(socket);
  const apiFetch = options?.apiFetch;
  const [messages, setMessages] = useState<TableChatMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const drawerOpenRef = useRef(drawerOpen);
  const lastAtRef = useRef(0);
  const initialLoadDoneRef = useRef(false);

  useEffect(() => {
    drawerOpenRef.current = drawerOpen;
  }, [drawerOpen]);

  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      setUnread(0);
      setChatError(null);
      lastAtRef.current = 0;
      initialLoadDoneRef.current = false;
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !socket || !realtime) return;

    const onMessage = (msg: TableChatMessage) => {
      if (msg.sessionId !== sessionId) return;
      applyIncoming([msg], {
        initialLoadDoneRef,
        lastAtRef,
        drawerOpenRef,
        setMessages,
        setUnread,
        after: lastAtRef.current
      });
    };

    const onHistory = (payload: { sessionId?: string; messages?: TableChatMessage[] }) => {
      if (payload.sessionId !== sessionId || !payload.messages) return;
      setMessages(payload.messages);
      const last = payload.messages.at(-1);
      if (last) lastAtRef.current = last.at;
      initialLoadDoneRef.current = true;
    };

    const onSessionError = (payload: { code?: string }) => {
      const code = payload?.code;
      if (code && isChatErrorCode(code)) {
        setChatError(code);
      }
    };

    socket.on('tableChatMessage', onMessage);
    socket.on('tableChatHistory', onHistory);
    socket.on('sessionError', onSessionError);
    socket.emit('tableChatJoin', { sessionId });

    return () => {
      socket.off('tableChatMessage', onMessage);
      socket.off('tableChatHistory', onHistory);
      socket.off('sessionError', onSessionError);
    };
  }, [sessionId, socket, realtime]);

  useEffect(() => {
    if (!sessionId || realtime || !apiFetch) return;

    let cancelled = false;
    const abort = new AbortController();

    const ingest = (incoming: TableChatMessage[], after?: number) => {
      applyIncoming(incoming, {
        initialLoadDoneRef,
        lastAtRef,
        drawerOpenRef,
        setMessages,
        setUnread,
        after
      });
    };

    const loadHistory = async () => {
      const res = await apiFetch(`/game/session/${encodeURIComponent(sessionId)}/chat`, {
        signal: abort.signal
      });
      if (cancelled) return false;
      if (res.status === 403) {
        setChatError('NOT_IN_SESSION');
        return false;
      }
      if (!res.ok) return false;
      const data = (await res.json()) as { messages?: TableChatMessage[] };
      ingest(data.messages ?? []);
      return true;
    };

    const waitLoop = async () => {
      const ok = await loadHistory();
      if (!ok || cancelled) return;

      while (!cancelled) {
        const after = lastAtRef.current;
        const qs = after > 0 ? `?after=${after}` : '';
        try {
          const res = await apiFetch(
            `/game/session/${encodeURIComponent(sessionId)}/chat/wait${qs}`,
            { signal: abort.signal }
          );
          if (cancelled) return;
          if (res.status === 403) {
            setChatError('NOT_IN_SESSION');
            return;
          }
          if (!res.ok) {
            await new Promise((r) => setTimeout(r, CHAT_RETRY_MS));
            continue;
          }
          const data = (await res.json()) as { messages?: TableChatMessage[] };
          ingest(data.messages ?? [], after);
        } catch {
          if (cancelled || abort.signal.aborted) return;
          await new Promise((r) => setTimeout(r, CHAT_RETRY_MS));
        }
      }
    };

    void waitLoop();

    return () => {
      cancelled = true;
      abort.abort();
    };
  }, [sessionId, realtime, apiFetch]);

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    setUnread(0);
    setChatError(null);
  }, []);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!sessionId || !text.trim()) return;
      setChatError(null);

      if (realtime && socket) {
        socket.emit('tableChatSend', { sessionId, text: text.trim() });
        return;
      }

      if (!apiFetch) return;

      const res = await apiFetch(`/game/session/${encodeURIComponent(sessionId)}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() })
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { code?: string } | null;
        if (data?.code && isChatErrorCode(data.code)) {
          setChatError(data.code);
        }
        return;
      }
      const data = (await res.json()) as { message?: TableChatMessage };
      if (data.message) {
        setMessages((prev) => mergeMessages(prev, [data.message!]));
        lastAtRef.current = Math.max(lastAtRef.current, data.message.at);
      }
    },
    [sessionId, socket, realtime, apiFetch]
  );

  return {
    messages,
    unread,
    drawerOpen,
    chatError,
    openDrawer,
    closeDrawer,
    setDrawerOpen,
    sendMessage
  };
}
