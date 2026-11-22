// Midnight Vault — sound: small procedural WebAudio effects, no audio files.
// Everything is synthesized at run time (a blip, a chime, a siren swell), so the game
// stays a handful of static files and plays with no network request. Sound starts only
// after the player's first key or click, as browsers require.

export function createSound() {
  return { ctx: null, muted: false, alarmOsc: null };
}

function ensureContext(sound) {
  if (sound.ctx) return sound.ctx;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    sound.ctx = new AudioContext();
  } catch (error) {
    sound.ctx = null;
  }
  return sound.ctx;
}

export function unlockSound(sound) {
  const ctx = ensureContext(sound);
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

function tone(sound, frequency, seconds, type, volume, when) {
  const ctx = ensureContext(sound);
  if (!ctx || sound.muted) return;
  const start = ctx.currentTime + (when || 0);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume || 0.12, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + seconds + 0.05);
}

export function soundPickup(sound) {
  tone(sound, 880, 0.12, 'sine', 0.14);
  tone(sound, 1318, 0.18, 'sine', 0.12, 0.08);
}

export function soundIdol(sound) {
  tone(sound, 523, 0.16, 'triangle', 0.16);
  tone(sound, 659, 0.16, 'triangle', 0.16, 0.12);
  tone(sound, 784, 0.3, 'triangle', 0.16, 0.24);
}

export function soundSmoke(sound) {
  tone(sound, 220, 0.35, 'sawtooth', 0.05);
}

export function soundLoop(sound) {
  tone(sound, 440, 0.1, 'square', 0.06);
  tone(sound, 440, 0.1, 'square', 0.06, 0.14);
}

export function soundCaught(sound) {
  tone(sound, 196, 0.5, 'sawtooth', 0.16);
  tone(sound, 147, 0.7, 'sawtooth', 0.16, 0.25);
}

export function soundWin(sound) {
  const notes = [523, 659, 784, 1046];
  notes.forEach((note, index) => tone(sound, note, 0.25, 'triangle', 0.15, index * 0.13));
}

export function soundClick(sound) {
  tone(sound, 660, 0.06, 'sine', 0.08);
}

export function toggleMute(sound) {
  sound.muted = !sound.muted;
  return sound.muted;
}
