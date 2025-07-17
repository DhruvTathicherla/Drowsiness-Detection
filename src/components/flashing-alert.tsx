
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
                gradient: `linear-gradient(45deg, #ff8c42, #ffdd4b, #ff8c42)`,
                animation: 'pulse-moderate 2s infinite'
            };
        case 'Severely Drowsy':
            return {
                text: 'SEVERE DROWSINESS',
                gradient: `linear-gradient(45deg, #ff414d, #ff8c42, #ff414d)`,
                animation: 'pulse-severe 1s infinite'
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
                background: alertConfig.gradient,
                backgroundSize: '400% 400%',
                animation: `${alertConfig.animation}, gradient-animation 10s ease infinite`
            });
        }
    }, [isAlerting, alertConfig.gradient, alertConfig.animation]);

    const alertBarClasses = cn(
        'fixed top-0 w-4 h-full shadow-2xl shadow-destructive/50 transition-opacity duration-500 ease-in-out flex items-center justify-center',
        isAlerting ? 'opacity-100' : 'opacity-0 pointer-events-none'
    );

    return (
        <>
            {/* Left Alert Bar */}
            <div className={cn(alertBarClasses, 'left-0')} style={isAlerting ? gradientStyle : {}}>
                <div className="transform -rotate-90 whitespace-nowrap flex items-center gap-4 text-white font-bold text-xl tracking-wider">
                    <Siren className="w-6 h-6" />
                    <span>{alertConfig.text.toUpperCase()}</span>
                    <Siren className="w-6 h-6" />
                </div>
            </div>
            {/* Right Alert Bar */}
            <div className={cn(alertBarClasses, 'right-0')} style={isAlerting ? gradientStyle : {}}>
                <div className="transform -rotate-90 whitespace-nowrap flex items-center gap-4 text-white font-bold text-xl tracking-wider">
                    <Siren className="w-6 h-6" />
                    <span>{alertConfig.text.toUpperCase()}</span>
                    <Siren className="w-6 h-6" />
                </div>
            </div>
        </>
    );
}
