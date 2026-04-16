import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';

/**
 * Minimal WebRTC voice mesh: relays SDP/ICE via existing Socket.IO room using `voiceSignal` events.
 * Production should use TURN servers and stricter auth.
 */
export function VoiceRoom() {
  const { socket, session } = useAppStore();
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'live' | 'error'>('idle');

  useEffect(() => {
    if (!socket || !session?.sessionId) return;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    pcRef.current = pc;

    const onSignal = async (msg: {
      type: 'offer' | 'answer' | 'candidate';
      sdp?: RTCSessionDescriptionInit;
      candidate?: RTCIceCandidateInit;
      from?: string;
    }) => {
      try {
        if (msg.type === 'offer' && msg.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('voiceSignal', {
            sessionId: session.sessionId,
            type: 'answer',
            sdp: pc.localDescription
          });
        } else if (msg.type === 'answer' && msg.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        } else if (msg.type === 'candidate' && msg.candidate) {
          await pc.addIceCandidate(msg.candidate);
        }
      } catch {
        setStatus('error');
      }
    };

    socket.on('voiceSignal', onSignal);

    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        socket.emit('voiceSignal', {
          sessionId: session.sessionId,
          type: 'candidate',
          candidate: ev.candidate.toJSON()
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setStatus('live');
      if (pc.connectionState === 'failed') setStatus('error');
    };

    return () => {
      socket.off('voiceSignal', onSignal);
      pc.close();
      pcRef.current = null;
    };
  }, [socket, session?.sessionId]);

  const startPushToTalk = async () => {
    const pc = pcRef.current;
    const sock = socket;
    if (!pc || !sock || !session?.sessionId) return;
    setStatus('connecting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sock.emit('voiceSignal', {
        sessionId: session.sessionId,
        type: 'offer',
        sdp: pc.localDescription
      });
    } catch {
      setStatus('error');
    }
  };

  if (!session?.sessionId) {
    return <p className="text-xs text-subtle">Join a table to enable voice (beta).</p>;
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <button
        type="button"
        onClick={startPushToTalk}
        className="rounded-lg border border-emerald/40 bg-emerald/10 px-3 py-2 text-xs font-semibold text-emerald hover:bg-emerald/20"
      >
        Start voice session (beta)
      </button>
      <p className="text-[11px] text-subtle">
        State: {status} — uses peer relay through game socket; add TURN for production NAT traversal.
      </p>
    </div>
  );
}
