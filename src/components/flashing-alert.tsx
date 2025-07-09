
"use client";

import { Siren } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface FlashingAlertProps {
  isAlerting: boolean;
  alertText: string;
}

export default function FlashingAlert({ isAlerting, alertText }: FlashingAlertProps) {
    const [gradientStyle, setGradientStyle] = useState({});

    useEffect(() => {
        let animationFrameId: number;
        if (isAlerting) {
            let angle = 0;
            const animateGradient = () => {
                angle = (angle + 1) % 360;
                setGradientStyle({
                    background: `linear-gradient(${angle}deg, #ff414d, #ff8c42, #ffdd4b, #ff8c42, #ff414d)`,
                    backgroundSize: '400% 400%',
                });
                animationFrameId = requestAnimationFrame(animateGradient);
            };
            animateGradient();
        } else {
            setGradientStyle({});
        }

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [isAlerting]);

    const alertBarClasses = cn(
        'fixed top-0 w-4 h-full shadow-2xl shadow-destructive/50 transition-opacity duration-500 ease-in-out flex items-center justify-center',
        'animate-pulse',
        isAlerting ? 'opacity-100' : 'opacity-0 pointer-events-none'
    );

    return (
        <>
            {/* Left Alert Bar */}
            <div className={cn(alertBarClasses, 'left-0')} style={gradientStyle}>
                <div className="transform -rotate-90 whitespace-nowrap flex items-center gap-4 text-white font-bold text-xl tracking-wider">
                    <Siren className="w-6 h-6" />
                    <span>{alertText.toUpperCase()}</span>
                    <Siren className="w-6 h-6" />
                </div>
            </div>
            {/* Right Alert Bar */}
            <div className={cn(alertBarClasses, 'right-0')} style={gradientStyle}>
                <div className="transform -rotate-90 whitespace-nowrap flex items-center gap-4 text-white font-bold text-xl tracking-wider">
                    <Siren className="w-6 h-6" />
                    <span>{alertText.toUpperCase()}</span>
                    <Siren className="w-6 h-6" />
                </div>
            </div>
        </>
    );
}
