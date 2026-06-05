import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usesRealtimeSocket } from '../config/api';
import { useAppStore } from '../store/useAppStore';

/** Navigates to the table when Socket.IO matchmaking finds a match. */
export function MatchRedirect() {
  const navigate = useNavigate();
  const socket = useAppStore((s) => s.socket);
  const userId = useAppStore((s) => s.userId);
  const mode = useAppStore((s) => s.mode);

  useEffect(() => {
    if (!usesRealtimeSocket() || !socket) return;
    const onMatch = (match: { sessionId: string; buyIn?: number; mode?: string }) => {
      socket.emit('joinSession', {
        sessionId: match.sessionId,
        userId,
        mode: (match.mode as 'HOLDEM' | 'RASPISNOY') ?? mode,
        buyIn: match.buyIn ?? 100
      });
      navigate(`/table/${match.sessionId}`);
    };
    socket.on('matchFound', onMatch);
    return () => {
      socket.off('matchFound', onMatch);
    };
  }, [socket, userId, mode, navigate]);

  return null;
}
