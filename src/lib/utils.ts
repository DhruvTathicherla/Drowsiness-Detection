import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

let audioContext: AudioContext | null = null;
let continuousAlert: { oscillator: OscillatorNode, gainNode: GainNode } | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window !== 'undefined') {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume context on user interaction if it's suspended.
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    return audioContext;
  }
  return null;
}

export function playAlertSound() {
  const context = getAudioContext();
  if (!context || continuousAlert) return; // Don't play if continuous alert is active

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  // Sound properties
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(880, context.currentTime); 
  gainNode.gain.setValueAtTime(0.5, context.currentTime);

  oscillator.start(context.currentTime);
  oscillator.stop(context.currentTime + 0.2);
}

export function startContinuousAlert() {
  const context = getAudioContext();
  if (!context || continuousAlert) return;

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  // Beep-pause pattern
  oscillator.type = 'square';
  gainNode.gain.setValueAtTime(0.3, context.currentTime);
  oscillator.frequency.setValueAtTime(960, context.currentTime);
  
  // Create a looping effect
  const loop = () => {
    gainNode.gain.setValueAtTime(0.3, context.currentTime);
    setTimeout(() => {
        gainNode.gain.setValueAtTime(0, context.currentTime);
    }, 200); // Beep for 200ms
  };
  
  oscillator.start(context.currentTime);
  
  const intervalId = setInterval(loop, 600); // Beep every 600ms
  
  continuousAlert = { oscillator, gainNode };
  
  // Add a way to stop it
  continuousAlert.oscillator.onended = () => {
    clearInterval(intervalId);
  };
}

export function stopContinuousAlert() {
  if (continuousAlert) {
    continuousAlert.oscillator.stop();
    continuousAlert = null;
  }
}
