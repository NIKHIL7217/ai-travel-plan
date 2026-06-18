/**
 * Web Audio API Sci-Fi Sound Synthesizer for RoamAI HUD
 */

let isAudioMuted = false;

export const toggleMute = () => {
  isAudioMuted = !isAudioMuted;
  return isAudioMuted;
};

export const getMuteState = () => isAudioMuted;

/**
 * Synthesizes a clean sine/triangle chime
 */
export function playChime(frequency = 600, type = "sine", duration = 0.1, volume = 0.02) {
  if (isAudioMuted) return;

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    
    // Smooth volume ramp to prevent speaker pops
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Silently ignore audio blockages from browser security
  }
}

/**
 * Sci-Fi HUD Boot notification tone
 */
export function playSystemBoot() {
  setTimeout(() => playChime(520, "sine", 0.08, 0.03), 0);
  setTimeout(() => playChime(780, "sine", 0.06, 0.03), 60);
  setTimeout(() => playChime(1040, "sine", 0.12, 0.04), 120);
}

/**
 * Navigation waypoint selection click tone
 */
export function playClickTone() {
  playChime(950, "sine", 0.04, 0.025);
}

/**
 * Interactive cursor hover sweep tone
 */
export function playHoverTone() {
  playChime(1300, "triangle", 0.02, 0.008);
}

/**
 * Error / Warning notification tone
 */
export function playWarningChime() {
  setTimeout(() => playChime(320, "sawtooth", 0.15, 0.02), 0);
  setTimeout(() => playChime(320, "sawtooth", 0.15, 0.02), 180);
}
