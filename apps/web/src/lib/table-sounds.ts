/** Lightweight synthetic poker sounds via Web Audio (no asset files). */

let ctx: AudioContext | null = null;

/** Shared Web Audio context for table SFX and ambient music. */
export const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
  return ctx;
};

const getCtx = getAudioContext;

const tone = (freq: number, durationMs: number, type: OscillatorType = 'sine', gain = 0.08) => {
  const audio = getCtx();
  if (!audio) return;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g);
  g.connect(audio.destination);
  const t = audio.currentTime;
  g.gain.exponentialRampToValueAtTime(0.001, t + durationMs / 1000);
  osc.start(t);
  osc.stop(t + durationMs / 1000);
};

export const playChipSound = () => {
  tone(880, 60, 'triangle', 0.06);
  setTimeout(() => tone(1100, 50, 'triangle', 0.04), 30);
};

export const playCardSound = () => tone(520, 70, 'sine', 0.05);

export const playFoldSound = () => tone(220, 120, 'sawtooth', 0.04);

export const playCheckSound = () => tone(660, 50, 'sine', 0.035);

export const playWinSound = () => {
  [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 140, 'sine', 0.06), i * 90));
};

export const playStreetSound = () => tone(440, 90, 'triangle', 0.05);

export const playBlindSound = () => {
  playChipSound();
  setTimeout(() => playChipSound(), 80);
};

export const playShuffleSound = () => {
  const freqs = [280, 340, 420, 360, 300];
  freqs.forEach((f, i) => setTimeout(() => tone(f, 55, 'triangle', 0.035), i * 45));
};
