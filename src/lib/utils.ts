import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window !== 'undefined') {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContext;
  }
  return null;
}

export function playAlertSound() {
  const context = getAudioContext();
  if (!context) return;

  // Resume context on user interaction
  if (context.state === 'suspended') {
    context.resume();
  }

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  // Sound properties
  oscillator.type = 'sine'; // A simple, non-jarring tone
  oscillator.frequency.setValueAtTime(880, context.currentTime); // A4 note, a common alert frequency
  gainNode.gain.setValueAtTime(0.5, context.currentTime); // Volume

  // Play the sound
  oscillator.start(context.currentTime);
  // Stop after a short duration
  oscillator.stop(context.currentTime + 0.2); // Play for 200ms
}
