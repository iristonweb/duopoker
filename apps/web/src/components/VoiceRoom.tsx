import { useCallback, useEffect, useRef, useState } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import { useAppStore } from '../store/useAppStore';

type VoiceStatus = 'idle' | 'checking' | 'connecting' | 'live' | 'error' | 'unavailable';

/**
 * Table voice via LiveKit Cloud SFU (option B).
 * Backend mints a short-lived JWT at POST /voice/token.
 */
export function VoiceRoom() {
  const { session, userId, displayName, apiFetch } = useAppStore();
  const roomRef = useRef<Room | null>(null);
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [micOn, setMicOn] = useState(false);
  const [participants, setParticipants] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const refreshCount = useCallback((room: Room) => {
    setParticipants(room.remoteParticipants.size + (room.localParticipant ? 1 : 0));
  }, []);

  const leaveVoice = useCallback(async () => {
    const room = roomRef.current;
    if (room) {
      await room.disconnect();
      roomRef.current = null;
    }
    setMicOn(false);
    setParticipants(0);
    setStatus('idle');
  }, []);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      setStatus('checking');
      try {
        const res = await apiFetch('/voice/status');
        if (cancelled) return;
        if (!res.ok) {
          setStatus('unavailable');
          return;
        }
        const data = (await res.json()) as { livekit?: string };
        setStatus(data.livekit === 'configured' ? 'idle' : 'unavailable');
      } catch {
        if (!cancelled) setStatus('unavailable');
      }
    };
    void check();
    return () => {
      cancelled = true;
      void leaveVoice();
    };
  }, [apiFetch, leaveVoice, session?.sessionId]);

  const joinVoice = async () => {
    if (!session?.sessionId) return;
    setErrorMsg(null);
    setStatus('connecting');
    try {
      const res = await apiFetch('/voice/token', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: session.sessionId,
          userId,
          displayName: displayName ?? undefined
        })
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(typeof err.error === 'string' ? err.error : 'Token request failed');
      }
      const { token, url } = (await res.json()) as { token: string; url: string };

      await leaveVoice();

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      const onParticipants = () => refreshCount(room);
      room.on(RoomEvent.ParticipantConnected, onParticipants);
      room.on(RoomEvent.ParticipantDisconnected, onParticipants);
      room.on(RoomEvent.Disconnected, () => {
        setStatus('idle');
        setMicOn(false);
        setParticipants(0);
      });

      await room.connect(url, token);
      await room.localParticipant.setMicrophoneEnabled(true);
      setMicOn(true);
      refreshCount(room);
      setStatus('live');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Voice connection failed');
      setStatus('error');
      await leaveVoice();
    }
  };

  const toggleMic = async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !micOn;
    await room.localParticipant.setMicrophoneEnabled(next);
    setMicOn(next);
  };

  if (!session?.sessionId) {
    return <p className="text-xs text-subtle">Join a table to enable voice.</p>;
  }

  if (status === 'checking') {
    return <p className="text-xs text-subtle">Checking voice service…</p>;
  }

  if (status === 'unavailable') {
    return (
      <p className="mt-2 text-[11px] text-subtle">
        LiveKit is not configured on the server. Add{' '}
        <code className="font-mono">LIVEKIT_API_KEY</code>, <code className="font-mono">LIVEKIT_API_SECRET</code>,{' '}
        <code className="font-mono">LIVEKIT_URL</code> (from{' '}
        <a href="https://cloud.livekit.io" className="text-gold/80 hover:underline" target="_blank" rel="noreferrer">
          cloud.livekit.io
        </a>
        ) on Render or Vercel.
      </p>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      {status === 'live' ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void toggleMic()}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                micOn
                  ? 'border-emerald/40 bg-emerald/10 text-emerald'
                  : 'border-white/15 bg-white/5 text-muted'
              }`}
            >
              {micOn ? 'Mic on' : 'Mic muted'}
            </button>
            <button
              type="button"
              onClick={() => void leaveVoice()}
              className="rounded-lg border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-xs font-semibold text-rose-300"
            >
              Leave voice
            </button>
          </div>
          <p className="text-[11px] text-subtle">
            LiveKit · {participants} in room · TURN/NAT handled by LiveKit Cloud
          </p>
        </>
      ) : (
        <button
          type="button"
          disabled={status === 'connecting'}
          onClick={() => void joinVoice()}
          className="rounded-lg border border-emerald/40 bg-emerald/10 px-3 py-2 text-xs font-semibold text-emerald hover:bg-emerald/20 disabled:opacity-50"
        >
          {status === 'connecting' ? 'Connecting…' : 'Join voice (LiveKit)'}
        </button>
      )}
      {errorMsg ? <p className="text-[11px] text-rose-400">{errorMsg}</p> : null}
    </div>
  );
}
