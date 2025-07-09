
"use client";

import { Siren } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlashingAlertProps {
  isAlerting: boolean;
  alertText: string;
}

export default function FlashingAlert({ isAlerting, alertText }: FlashingAlertProps) {
  const alertBarClasses = cn(
    'fixed top-0 w-4 h-full bg-destructive/80 backdrop-blur-sm shadow-2xl shadow-destructive/50 transition-opacity duration-500 ease-in-out flex items-center justify-center',
    'animate-pulse',
    isAlerting ? 'opacity-100' : 'opacity-0 pointer-events-none'
  );

  return (
    <>
      {/* Left Alert Bar */}
      <div className={cn(alertBarClasses, 'left-0')}>
        <div className="transform -rotate-90 whitespace-nowrap flex items-center gap-4 text-destructive-foreground font-bold text-xl tracking-wider">
          <Siren className="w-6 h-6" />
          <span>{alertText.toUpperCase()}</span>
          <Siren className="w-6 h-6" />
        </div>
      </div>
      {/* Right Alert Bar */}
      <div className={cn(alertBarClasses, 'right-0')}>
        <div className="transform -rotate-90 whitespace-nowrap flex items-center gap-4 text-destructive-foreground font-bold text-xl tracking-wider">
          <Siren className="w-6 h-6" />
          <span>{alertText.toUpperCase()}</span>
          <Siren className="w-6 h-6" />
        </div>
      </div>
    </>
  );
}
