import { AccessToken } from 'livekit-server-sdk';

export type LiveKitConfig = {
  apiKey: string;
  apiSecret: string;
  url: string;
};

const PLACEHOLDER_MARKERS = ['your-project', 'xxx.livekit', 'example.livekit', 'changeme', 'placeholder'];

export const isLiveKitConfigured = (cfg: LiveKitConfig): boolean => {
  const { apiKey, apiSecret, url } = cfg;
  if (!apiKey?.trim() || !apiSecret?.trim() || !url?.trim()) return false;
  const urlLower = url.toLowerCase();
  if (!urlLower.startsWith('wss://') && !urlLower.startsWith('ws://')) return false;
  if (PLACEHOLDER_MARKERS.some((m) => urlLower.includes(m) || apiKey.toLowerCase().includes(m))) {
    return false;
  }
  if (apiKey.length < 10 || apiSecret.length < 10) return false;
  return true;
};

/** Room name safe for LiveKit (alphanumeric + hyphen). */
export const voiceRoomName = (sessionId: string): string =>
  `table-${sessionId.replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 120)}`;

export const createVoiceRoomToken = async (
  cfg: LiveKitConfig,
  opts: { sessionId: string; userId: string; displayName?: string }
) => {
  const roomName = voiceRoomName(opts.sessionId);
  const at = new AccessToken(cfg.apiKey, cfg.apiSecret, {
    identity: opts.userId.slice(0, 128),
    name: (opts.displayName ?? opts.userId).slice(0, 64),
    ttl: '2h'
  });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true
  });
  const token = await at.toJwt();
  return { token, url: cfg.url, roomName };
};
