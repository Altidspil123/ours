// Tiny WebAudio chimes — no audio files needed.
// Everything fails silently (autoplay policies, no AudioContext, etc.).

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function note(
  ac: AudioContext,
  freq: number,
  at: number,
  dur: number,
  type: OscillatorType,
  gainPeak: number,
) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = ac.currentTime + at;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(gainPeak, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/** Soft two-note chime for an incoming message. */
export function playMessageChime() {
  const ac = audio();
  if (!ac) return;
  try {
    note(ac, 659.25, 0, 0.32, "sine", 0.045); // E5
    note(ac, 987.77, 0.11, 0.4, "sine", 0.04); // B5
  } catch {
    /* ignore */
  }
}

/** Brighter rising cascade for the splash signal. */
export function playSignalChime() {
  const ac = audio();
  if (!ac) return;
  try {
    note(ac, 523.25, 0, 0.3, "triangle", 0.05); // C5
    note(ac, 659.25, 0.09, 0.3, "triangle", 0.05); // E5
    note(ac, 783.99, 0.18, 0.34, "triangle", 0.05); // G5
    note(ac, 1046.5, 0.27, 0.55, "sine", 0.055); // C6 shimmer
    note(ac, 2093, 0.27, 0.4, "sine", 0.015); // sparkle octave
  } catch {
    /* ignore */
  }
}
