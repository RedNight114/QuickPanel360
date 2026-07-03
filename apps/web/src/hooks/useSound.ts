'use client';

type SoundType = 'sale' | 'message' | 'alert';

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  gainValue = 0.15,
) {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(gainValue, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
    oscillator.onended = () => void ctx.close();
  } catch {
    // AudioContext not available (SSR or restricted context)
  }
}

function playSaleSound() {
  // Dos tonos ascendentes — confirmación positiva
  playTone(520, 0.1);
  setTimeout(() => playTone(780, 0.15), 100);
}

function playMessageSound() {
  // Tono suave de notificación
  playTone(880, 0.12, 'sine', 0.08);
}

function playAlertSound() {
  // Tono de aviso
  playTone(440, 0.2, 'triangle', 0.12);
}

function isSoundsEnabled() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('pref:sounds') === 'true';
}

export function playSound(type: SoundType) {
  if (!isSoundsEnabled()) return;
  if (type === 'sale') playSaleSound();
  else if (type === 'message') playMessageSound();
  else if (type === 'alert') playAlertSound();
}
