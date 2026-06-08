import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { TableChatMessage } from '@duopoker/shared-types/index';
import { isChatErrorCode } from '../session/table-errors';

export function useTableChat(sessionId: string | undefined, socket: Socket | null) {
  const [messages, setMessages] = useState<TableChatMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const drawerOpenRef = useRef(drawerOpen);

  useEffect(() => {
    drawerOpenRef.current = drawerOpen;
  }, [drawerOpen]);

  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      setUnread(0);
      setChatError(null);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !socket) return;

    const onMessage = (msg: TableChatMessage) => {
      if (msg.sessionId !== sessionId) return;
      setMessages((prev) => [...prev.slice(-99), msg]);
      if (!drawerOpenRef.current) {
        setUnread((n) => n + 1);
      }
    };

    const onHistory = (payload: { sessionId?: string; messages?: TableChatMessage[] }) => {
      if (payload.sessionId !== sessionId || !payload.messages) return;
      setMessages(payload.messages);
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
  }, [sessionId, socket]);

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    setUnread(0);
    setChatError(null);
  }, []);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const sendMessage = useCallback(
    (text: string) => {
      if (!sessionId || !socket || !text.trim()) return;
      setChatError(null);
      socket.emit('tableChatSend', {
        sessionId,
        text: text.trim()
      });
    },
    [sessionId, socket]
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
