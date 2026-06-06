/**
 * Soft lounge ambient loop via Web Audio — no external assets, low volume, seamless loop.
 * Designed to sit under SFX without fatigue during long sessions.
 */

import { getAudioContext } from './table-sounds';

const BPM = 72;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const LOOP_BARS = 16;
const LOOP_SEC = BAR * LOOP_BARS;

/** Am7 → Fmaj7 → Dm7 → E7 (warm casino-lounge feel) */
const CHORDS: { freqs: number[]; root: number }[] = [
  { root: 220.0, freqs: [220.0, 261.63, 329.63, 392.0] },
  { root: 174.61, freqs: [174.61, 220.0, 261.63, 329.63] },
  { root: 146.83, freqs: [146.83, 174.61, 220.0, 261.63] },
  { root: 164.81, freqs: [164.81, 207.65, 246.94, 311.13] }
];

let masterGain: GainNode | null = null;
let filter: BiquadFilterNode | null = null;
let lfo: OscillatorNode | null = null;
let lfoGain: GainNode | null = null;
let loopTimer: ReturnType<typeof setInterval> | null = null;
let running = false;

const ensureCtx = async (): Promise<AudioContext | null> => {
  const audio = getAudioContext();
  if (audio?.state === 'suspended') await audio.resume().catch(() => undefined);
  return audio;
};

const buildGraph = (audio: AudioContext) => {
  masterGain = audio.createGain();
  masterGain.gain.value = 0.055;

  filter = audio.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  filter.Q.value = 0.4;

  lfo = audio.createOscillator();
  lfoGain = audio.createGain();
  lfo.frequency.value = 0.08;
  lfoGain.gain.value = 180;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  lfo.start();

  filter.connect(masterGain);
  masterGain.connect(audio.destination);
};

const spawnPad = (audio: AudioContext, freq: number, startAt: number, duration: number, peak = 0.018) => {
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  osc.detune.value = (Math.random() - 0.5) * 8;
  g.gain.setValueAtTime(0.0001, startAt);
  g.gain.linearRampToValueAtTime(peak, startAt + 1.8);
  g.gain.setValueAtTime(peak * 0.85, startAt + duration - 2);
  g.gain.linearRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(g);
  g.connect(filter!);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
};

const scheduleLoop = (audio: AudioContext, baseTime: number) => {
  const chordDuration = LOOP_SEC / CHORDS.length;
  CHORDS.forEach((chord, ci) => {
    const chordStart = baseTime + ci * chordDuration;
    for (const f of chord.freqs) {
      spawnPad(audio, f, chordStart, chordDuration - 0.2);
    }
    spawnPad(audio, chord.root / 2, chordStart, chordDuration - 0.2, 0.012);
  });

  for (let bar = 0; bar < LOOP_BARS; bar += 2) {
    const t = baseTime + bar * BAR;
    const buf = audio.createBuffer(1, audio.sampleRate * 0.04, audio.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * 0.35;
    }
    const src = audio.createBufferSource();
    src.buffer = buf;
    const ng = audio.createGain();
    const nf = audio.createBiquadFilter();
    nf.type = 'highpass';
    nf.frequency.value = 6000;
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.linearRampToValueAtTime(0.008, t + 0.008);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    src.connect(nf);
    nf.connect(ng);
    ng.connect(filter!);
    src.start(t);
    src.stop(t + 0.07);
  }
};

const tick = async () => {
  const audio = await ensureCtx();
  if (!audio || !running || !filter) return;
  scheduleLoop(audio, audio.currentTime + 0.05);
};

export const startTableMusic = async (): Promise<boolean> => {
  const audio = await ensureCtx();
  if (!audio) return false;
  if (running) return true;

  if (!masterGain) buildGraph(audio);
  running = true;
  void tick();
  loopTimer = setInterval(() => void tick(), (LOOP_SEC - 0.5) * 1000);
  return true;
};

export const stopTableMusic = () => {
  running = false;
  if (loopTimer) {
    clearInterval(loopTimer);
    loopTimer = null;
  }
  if (lfo) {
    try {
      lfo.stop();
    } catch {
      /* noop */
    }
    lfo.disconnect();
    lfo = null;
  }
  if (lfoGain) {
    lfoGain.disconnect();
    lfoGain = null;
  }
  if (filter) {
    filter.disconnect();
    filter = null;
  }
  if (masterGain) {
    masterGain.disconnect();
    masterGain = null;
  }
};

export const isTableMusicRunning = (): boolean => running;

export const setTableMusicVolume = (level: number) => {
  if (masterGain) masterGain.gain.value = Math.max(0, Math.min(0.12, level));
};

const STORAGE_KEY = 'duopoker.tableMusic';

export const loadTableMusicPref = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === '1';
  } catch {
    return false;
  }
};

export const saveTableMusicPref = (on: boolean) => {
  try {
    localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
  } catch {
    /* private mode */
  }
};

const SFX_STORAGE_KEY = 'duopoker.tableSfx';

export const loadTableSfxPref = (): boolean => {
  if (typeof window === 'undefined') return true;
  try {
    const v = localStorage.getItem(SFX_STORAGE_KEY);
    return v !== '0';
  } catch {
    return true;
  }
};

export const saveTableSfxPref = (on: boolean) => {
  try {
    localStorage.setItem(SFX_STORAGE_KEY, on ? '1' : '0');
  } catch {
    /* noop */
  }
};
