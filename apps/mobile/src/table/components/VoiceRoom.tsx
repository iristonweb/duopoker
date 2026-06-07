import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Room, RoomEvent } from 'livekit-client';
import { apiFetch } from '../../lib/api';
import { useMobileStore } from '../../state/useMobileStore';
import { useVoiceSessionId } from '../hooks/useVoiceEligibility';
import { mobileTheme } from '../../theme';

const { colors } = mobileTheme;

type VoiceStatus = 'idle' | 'connecting' | 'live' | 'error';

const isMicPermissionError = (err: unknown): boolean => {
  const msg = err instanceof Error ? err.message : String(err);
  return /notallowed|permission|denied|NotFoundError|microphone/i.test(msg);
};

export function VoiceRoom() {
  const { t } = useTranslation();
  const sessionId = useVoiceSessionId();
  const accessToken = useMobileStore((s) => s.accessToken);
  const userId = useMobileStore((s) => s.userId);
  const user = useMobileStore((s) => s.user);
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
    if (!sessionId || !accessToken) return;
    setErrorMsg(null);
    setStatus('connecting');
    try {
      const res = await apiFetch(
        '/voice/token',
        {
          method: 'POST',
          body: JSON.stringify({
            sessionId,
            userId,
            displayName: user?.displayName
          })
        },
        accessToken
      );
      if (!res.ok) {
        setErrorMsg(await mapTokenError(res));
        setStatus('error');
        return;
      }
      const data = (await res.json()) as { token: string; url: string };
      await leaveVoice();
      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;
      room.on(RoomEvent.ParticipantConnected, () => refreshCount(room));
      room.on(RoomEvent.ParticipantDisconnected, () => refreshCount(room));
      room.on(RoomEvent.Disconnected, () => {
        setStatus('idle');
        setMicOn(false);
        setParticipants(0);
      });
      await room.connect(data.url, data.token);
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
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('voice.connectionFailed'));
      setStatus('error');
      await leaveVoice();
    }
  };

  const toggleMic = async () => {
    const room = roomRef.current;
    if (!room?.localParticipant) return;
    const next = !micOn;
    try {
      await room.localParticipant.setMicrophoneEnabled(next);
      setMicOn(next);
      if (next) setErrorMsg(null);
    } catch (e) {
      setErrorMsg(isMicPermissionError(e) ? t('voice.micPermissionDenied') : t('voice.micEnableFailed'));
    }
  };

  const displayName = user?.nickname ? `@${user.nickname}` : user?.displayName ?? 'Player';

  return (
    <View style={styles.root}>
      <Text style={styles.name}>{displayName}</Text>
      {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
      {status === 'idle' || status === 'error' ? (
        <Pressable style={styles.btn} onPress={() => void joinVoice()}>
          <Text style={styles.btnText}>{t('voice.join')}</Text>
        </Pressable>
      ) : status === 'connecting' ? (
        <Text style={styles.muted}>{t('voice.connecting')}</Text>
      ) : (
        <>
          <Text style={styles.muted}>
            {t('voice.participants', { count: participants })}
          </Text>
          <Pressable style={[styles.btn, micOn && styles.btnActive]} onPress={() => void toggleMic()}>
            <Text style={styles.btnText}>{micOn ? t('voice.mute') : t('voice.unmute')}</Text>
          </Pressable>
          <Pressable style={styles.btnGhost} onPress={() => void leaveVoice()}>
            <Text style={styles.btnGhostText}>{t('voice.leave')}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 10 },
  name: { color: colors.text, fontSize: 13, fontWeight: '600' },
  muted: { color: colors.textMuted, fontSize: 12 },
  error: { color: '#fca5a5', fontSize: 12 },
  btn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.35)',
    backgroundColor: 'rgba(74,222,128,0.12)',
    paddingVertical: 10,
    alignItems: 'center'
  },
  btnActive: { backgroundColor: 'rgba(74,222,128,0.25)' },
  btnText: { color: colors.emerald, fontWeight: '600', fontSize: 13 },
  btnGhost: { paddingVertical: 8, alignItems: 'center' },
  btnGhostText: { color: colors.textMuted, fontSize: 12 }
});
