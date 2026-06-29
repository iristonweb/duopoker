import { Audio, type AVPlaybackStatus } from 'expo-av';

export type TableSoundKind = 'chip' | 'card' | 'fold' | 'win' | 'check' | 'blind' | 'street' | 'raise' | 'shuffle';

let audioReady = false;
const uriCache = new Map<string, string>();

/** Minimal mono 16-bit PCM WAV as data URI (works offline, no asset files). */
function toneWavUri(freqHz: number, durationMs: number, volume = 0.25): string {
  const key = `${freqHz}-${durationMs}-${volume}`;
  const cached = uriCache.get(key);
  if (cached) return cached;

  const sampleRate = 22050;
  const numSamples = Math.floor((sampleRate * durationMs) / 1000);
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * freqHz * t) * volume * 32767;
    view.setInt16(44 + i * 2, sample, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  const uri = `data:audio/wav;base64,${globalThis.btoa(binary)}`;
  uriCache.set(key, uri);
  return uri;
}

async function ensureAudio() {
  if (audioReady) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false
    });
    audioReady = true;
  } catch {
    /* ignore */
  }
}

async function playTone(freq: number, ms: number, vol = 0.22) {
  await ensureAudio();
  try {
    const { sound } = await Audio.Sound.createAsync({ uri: toneWavUri(freq, ms, vol) }, { shouldPlay: true, volume: 1 });
    sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
      if (status.isLoaded && status.didJustFinish) void sound.unloadAsync();
    });
  } catch {
    /* ignore */
  }
}

export async function playTableSound(kind: TableSoundKind) {
  switch (kind) {
    case 'chip':
    case 'raise':
      await playTone(880, 60, 0.18);
      setTimeout(() => void playTone(1100, 50, 0.12), 30);
      break;
    case 'card':
      await playTone(520, 70, 0.16);
      break;
    case 'fold':
      await playTone(220, 120, 0.14);
      break;
    case 'check':
      await playTone(660, 50, 0.12);
      break;
    case 'win':
      await playTone(523, 140, 0.16);
      setTimeout(() => void playTone(659, 140, 0.16), 90);
      setTimeout(() => void playTone(784, 160, 0.16), 180);
      break;
    case 'street':
      await playTone(440, 90, 0.14);
      break;
    case 'blind':
      await playTableSound('chip');
      setTimeout(() => void playTableSound('chip'), 80);
      break;
    case 'shuffle': {
      const freqs = [280, 340, 420, 360, 300];
      freqs.forEach((f, i) => setTimeout(() => void playTone(f, 55, 0.1), i * 45));
      break;
    }
    default:
      break;
  }
}

let musicLoop: ReturnType<typeof setInterval> | null = null;

export async function setTableMusicEnabled(enabled: boolean) {
  await ensureAudio();
  if (musicLoop) {
    clearInterval(musicLoop);
    musicLoop = null;
  }
  if (!enabled) return;
  musicLoop = setInterval(() => {
    void playTone(220, 900, 0.04);
  }, 2400);
}
