// Tiny synthesized SFX so the game never depends on copyrighted/external
// audio files. Every sound is a couple of oscillator blips.

let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
}

export function setMuted(value: boolean) {
  muted = value;
}

export function isMuted() {
  return muted;
}

function tone(freq: number, startOffset: number, duration: number, type: OscillatorType = 'sine', gainValue = 0.06) {
  if (muted) return;
  try {
    const audioCtx = getCtx();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = gainValue;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const start = audioCtx.currentTime + startOffset;
    osc.start(start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.stop(start + duration);
  } catch {
    // Audio isn't available (e.g. autoplay blocked before first interaction) - fail silently.
  }
}

export const sfx = {
  capture: () => {
    tone(220, 0, 0.12, 'square');
    tone(140, 0.08, 0.15, 'square');
  },
  challengeReveal: () => {
    tone(440, 0, 0.1);
    tone(660, 0.1, 0.15);
  },
  achievement: () => {
    tone(523, 0, 0.1);
    tone(659, 0.1, 0.1);
    tone(784, 0.2, 0.2);
  },
  check: () => {
    tone(300, 0, 0.1, 'sawtooth', 0.05);
    tone(300, 0.15, 0.1, 'sawtooth', 0.05);
  },
  checkmate: () => {
    tone(196, 0, 0.25, 'sawtooth', 0.07);
    tone(174, 0.25, 0.25, 'sawtooth', 0.07);
    tone(147, 0.5, 0.4, 'sawtooth', 0.07);
  },
  move: () => {
    tone(300, 0, 0.06, 'triangle', 0.04);
  },
};
