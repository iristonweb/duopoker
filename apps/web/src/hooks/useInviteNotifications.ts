import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { playInviteSound, resumeInviteAudio } from '../lib/invite-sound';
import { useAppStore } from '../store/useAppStore';
import { usesRealtimeSocket } from '../config/api';

type InviteSocketPayload = {
  type?: string;
  title?: string;
  body?: string;
  url?: string;
  sound?: string;
  data?: Record<string, string>;
};

const POLL_MS = 15_000;

function collectInviteKeys(): Set<string> {
  const { vipInvites, tableInvites, vipLiveSession, tableLiveSessions } = useAppStore.getState();
  return new Set([
    ...vipInvites.map((v) => `vip:${v.duelId}`),
    ...tableInvites.map((t) => `table:${t.id}`),
    ...(vipLiveSession ? [`live:vip:${vipLiveSession.sessionId}`] : []),
    ...tableLiveSessions.map((l) => `live:table:${l.sessionId}`)
  ]);
}

export function useInviteNotifications() {
  const navigate = useNavigate();
  const accessToken = useAppStore((s) => s.accessToken);
  const socket = useAppStore((s) => s.socket);
  const connect = useAppStore((s) => s.connect);
  const fetchVipInvites = useAppStore((s) => s.fetchVipInvites);
  const fetchTableInvites = useAppStore((s) => s.fetchTableInvites);
  const realtime = usesRealtimeSocket();
  const seenKeys = useRef<Set<string> | null>(null);
  const pollReady = useRef(false);

  useEffect(() => {
    if (!accessToken) return;
    if (realtime) connect();
    void fetchVipInvites();
    void fetchTableInvites();
  }, [accessToken, connect, fetchVipInvites, fetchTableInvites, realtime]);

  /** Vercel-only: no Socket.IO — poll + sound on new invite */
  useEffect(() => {
    if (!accessToken || realtime) return;

    const refresh = async () => {
      await fetchVipInvites();
      await fetchTableInvites();
      const keys = collectInviteKeys();

      if (seenKeys.current === null) {
        seenKeys.current = keys;
        pollReady.current = true;
        return;
      }

      let isNew = false;
      for (const k of keys) {
        if (!seenKeys.current.has(k)) isNew = true;
      }
      seenKeys.current = keys;

      if (pollReady.current && isNew) {
        void resumeInviteAudio();
        playInviteSound();
      }
      pollReady.current = true;
    };

    void refresh();
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [accessToken, realtime, fetchVipInvites, fetchTableInvites]);

  useEffect(() => {
    if (!socket || !accessToken || !realtime) return;

    const onInvite = (payload: InviteSocketPayload) => {
      void resumeInviteAudio();
      playInviteSound();
      void fetchVipInvites();
      void fetchTableInvites();

      if (typeof document !== 'undefined' && document.visibilityState === 'hidden' && payload.title) {
        try {
          new Notification(payload.title, {
            body: payload.body,
            silent: false,
            tag: payload.type ?? 'duopoker-invite'
          });
        } catch {
          /* ignore */
        }
      }
    };

    const onTableLive = () => {
      void resumeInviteAudio();
      playInviteSound();
      void fetchVipInvites();
      void fetchTableInvites();
    };

    socket.on('vipInviteReceived', onInvite);
    socket.on('tableInviteReceived', onInvite);
    socket.on('tableLive', onTableLive);

    return () => {
      socket.off('vipInviteReceived', onInvite);
      socket.off('tableInviteReceived', onInvite);
      socket.off('tableLive', onTableLive);
    };
  }, [socket, accessToken, realtime, fetchVipInvites, fetchTableInvites, navigate]);
}
