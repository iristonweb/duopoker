import { AccessToken } from 'livekit-server-sdk';

export type LiveKitConfig = {
  apiKey: string;
  apiSecret: string;
  url: string;
};

export const isLiveKitConfigured = (cfg: LiveKitConfig): boolean =>
  Boolean(cfg.apiKey && cfg.apiSecret && cfg.url);

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
