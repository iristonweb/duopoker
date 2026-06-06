let audioCtx: AudioContext | null = null;

const ctx = (): AudioContext => {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
};

/** Distinct invite chime — separate from table SFX. */
export const playInviteSound = () => {
  try {
    const ac = ctx();
    const now = ac.currentTime;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    gain.connect(ac.destination);

    const oscA = ac.createOscillator();
    oscA.type = 'sine';
    oscA.frequency.setValueAtTime(880, now);
    oscA.frequency.exponentialRampToValueAtTime(1174, now + 0.12);
    oscA.connect(gain);
    oscA.start(now);
    oscA.stop(now + 0.2);

    const oscB = ac.createOscillator();
    oscB.type = 'triangle';
    oscB.frequency.setValueAtTime(1318, now + 0.14);
    oscB.connect(gain);
    oscB.start(now + 0.14);
    oscB.stop(now + 0.55);
  } catch {
    /* autoplay policy */
  }
};

export const resumeInviteAudio = async () => {
  try {
    await ctx().resume();
  } catch {
    /* ignore */
  }
};
