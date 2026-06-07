import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Room, RoomEvent } from 'livekit-client';
import { Button } from '@duopoker/ui-kit';
import { useVoiceEligibility } from '../hooks/useVoiceEligibility';
import { useAppStore } from '../store/useAppStore';

type VoiceStatus = 'idle' | 'connecting' | 'live' | 'error';

const isMicPermissionError = (err: unknown): boolean => {
  const msg = err instanceof Error ? err.message : String(err);
  return /notallowed|permission|denied|NotFoundError|microphone/i.test(msg);
};

export function VoiceRoom() {
  const { t } = useTranslation();
  const eligibility = useVoiceEligibility();
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

  useEffect(
    () => () => {
      void leaveVoice();
    },
    [leaveVoice]
  );

  const mapTokenError = async (res: Response): Promise<string> => {
    const err = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
    if (res.status === 401) return t('voice.signInRequired');
    if (err.code === 'TIER_REQUIRED') return t('voice.tierRequired');
    if (err.code === 'NOT_ASSIGNED') return t('voice.notInSession');
    return typeof err.error === 'string' ? err.error : t('voice.tokenFailed');
  };

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
        throw new Error(await mapTokenError(res));
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
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
        setMicOn(true);
      } catch (micErr) {
        setMicOn(false);
        setErrorMsg(
          isMicPermissionError(micErr) ? t('voice.micPermissionDenied') : t('voice.micEnableFailed')
        );
      }
      refreshCount(room);
      setStatus('live');
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      const invalidKey =
        /invalid api key|could not establish signal|permission denied|unauthorized/i.test(raw);
      if (invalidKey) {
        setErrorMsg(t('voice.invalidCredentials'));
      } else {
        setErrorMsg(raw || t('voice.connectionFailed'));
      }
      setStatus('error');
      await leaveVoice();
    }
  };

  const toggleMic = async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !micOn;
    try {
      await room.localParticipant.setMicrophoneEnabled(next);
      setMicOn(next);
      if (next) setErrorMsg(null);
    } catch (e) {
      setErrorMsg(isMicPermissionError(e) ? t('voice.micPermissionDenied') : t('voice.micEnableFailed'));
    }
  };

  if (!session?.sessionId) {
    return <p className="text-xs text-subtle">{t('voice.joinTableFirst')}</p>;
  }

  if (eligibility === 'checking') {
    return <p className="text-xs text-subtle">{t('voice.checking')}</p>;
  }

  if (eligibility === 'unavailable') {
    return <p className="text-[11px] leading-relaxed text-subtle">{t('voice.unavailable')}</p>;
  }

  if (eligibility === 'sign_in_required') {
    return (
      <div className="space-y-2">
        <p className="text-[11px] leading-relaxed text-subtle">{t('voice.signInRequired')}</p>
        <Link to="/login" className="text-xs font-semibold text-gold hover:text-gold-light">
          {t('voice.signInLink')}
        </Link>
      </div>
    );
  }

  if (eligibility === 'tier_required') {
    return (
      <div className="space-y-2">
        <p className="text-[11px] leading-relaxed text-subtle">{t('voice.tierRequired')}</p>
        <Link to="/lobby#subscriptions" className="text-xs font-semibold text-gold hover:text-gold-light">
          {t('voice.upgradeLink')}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {status === 'live' ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant={micOn ? 'secondary' : 'ghost'} size="sm" onClick={() => void toggleMic()}>
              {micOn ? t('voice.micOn') : t('voice.micMuted')}
            </Button>
            <Button variant="ghost" size="sm" className="text-rose-300 hover:text-rose-200" onClick={() => void leaveVoice()}>
              {t('voice.leave')}
            </Button>
          </div>
          <p className="text-[11px] text-subtle">
            {t('voice.liveStatus', { count: participants })}
          </p>
        </>
      ) : (
        <Button variant="secondary" size="sm" disabled={status === 'connecting'} onClick={() => void joinVoice()}>
          {status === 'connecting' ? t('voice.connecting') : t('voice.join')}
        </Button>
      )}
      {errorMsg ? <p className="text-[11px] text-rose-400">{errorMsg}</p> : null}
    </div>
  );
}
