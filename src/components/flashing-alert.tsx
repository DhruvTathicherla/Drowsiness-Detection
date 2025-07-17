
"use client";

import { Siren } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface FlashingAlertProps {
  isAlerting: boolean;
  level?: string;
}

const getAlertConfig = (level?: string) => {
    switch (level) {
        case 'Moderately Drowsy':
            return {
                text: 'MODERATE DROWSINESS',
                gradient: `linear-gradient(45deg, hsl(var(--accent)), hsl(48, 96%, 51%), hsl(var(--accent)))`,
                animation: 'pulse-moderate 2s infinite'
            };
        case 'Severely Drowsy':
            return {
                text: 'SEVERE DROWSINESS',
                gradient: `linear-gradient(45deg, hsl(var(--destructive)), hsl(var(--accent)), hsl(var(--destructive)))`,
                animation: 'pulse-severe 1.5s infinite'
            };
        default:
            return {
                text: 'DROWSINESS DETECTED',
                gradient: '',
                animation: ''
            };
    }
}

export default function FlashingAlert({ isAlerting, level }: FlashingAlertProps) {
    const [gradientStyle, setGradientStyle] = useState({});
    const alertConfig = getAlertConfig(level);

    useEffect(() => {
        if (isAlerting) {
            setGradientStyle({
                backgroundImage: alertConfig.gradient,
                backgroundSize: '400% 400%',
                animation: `${alertConfig.animation}, gradient-animation 10s ease infinite`
            });
        }
    }, [isAlerting, alertConfig.gradient, alertConfig.animation]);

    const alertBarClasses = cn(
        'fixed top-0 w-4 h-full shadow-2xl transition-opacity duration-500 ease-in-out flex items-center justify-center z-50',
        'shadow-black/50',
        isAlerting ? 'opacity-100' : 'opacity-0 pointer-events-none'
    );

    return (
        <>
            {/* Left Alert Bar */}
            <div className={cn(alertBarClasses, 'left-0')} style={isAlerting ? gradientStyle : {}}>
                <div className="transform -rotate-90 whitespace-nowrap flex items-center gap-4 text-white font-bold text-xl tracking-wider text-shadow-lg">
                    <Siren className="w-6 h-6 animate-pulse" />
                    <span>{alertConfig.text.toUpperCase()}</span>
                    <Siren className="w-6 h-6 animate-pulse" />
                </div>
            </div>
            {/* Right Alert Bar */}
            <div className={cn(alertBarClasses, 'right-0')} style={isAlerting ? gradientStyle : {}}>
                <div className="transform -rotate-90 whitespace-nowrap flex items-center gap-4 text-white font-bold text-xl tracking-wider">
                    <Siren className="w-6 h-6 animate-pulse" />
                    <span>{alertConfig.text.toUpperCase()}</span>
                    <Siren className="w-6 h-6 animate-pulse" />
                </div>
            </div>
        </>
    );
}
