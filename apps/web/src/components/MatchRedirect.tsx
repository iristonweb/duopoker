import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

/**
 * Listens for matchmaking and joins the table room, then navigates to the game route.
 */
export function MatchRedirect() {
  const navigate = useNavigate();
  const socket = useAppStore((s) => s.socket);
  const userId = useAppStore((s) => s.userId);
  const mode = useAppStore((s) => s.mode);

  useEffect(() => {
    if (!socket) return;
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
