"use client";

import { Card } from "@/components/ui/card";
import { Eye, Smile, Percent, GaugeCircle } from "lucide-react";
import type { Metrics } from "./dashboard";
import { cn } from "@/lib/utils";
import React from "react";

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  className?: string;
  iconBgClass?: string;
}

function MetricCard({ icon, title, value, className, iconBgClass }: MetricCardProps) {
  return (
    <Card className={cn("flex items-center p-4 shadow-md hover:shadow-lg transition-all duration-300 bg-card/80 backdrop-blur-sm border-border/20 hover:bg-card", className)}>
      <div className={cn("p-3 rounded-full mr-4", iconBgClass)}>
        {icon}
      </div>
      <div>
        <div className="text-3xl font-bold text-foreground tracking-tight">{value}</div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
      </div>
    </Card>
  );
}

const DrowsinessGauge = ({ score }: { score: number }) => {
    const percentage = score * 100;
    const circumference = 2 * Math.PI * 45; // 2 * pi * r
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
    const getScoreColor = (s: number) => {
      if (s > 0.75) return "text-destructive"; // Red
      if (s > 0.4) return "text-orange-500"; // Orange
      return "text-green-500"; // Green
    };

    return (
        <div className="relative flex items-center justify-center w-52 h-52">
            <svg className="w-full h-full" viewBox="0 0 100 100">
                {/* Background track */}
                <circle
                    className="stroke-muted/50"
                    strokeWidth="8"
                    stroke="currentColor"
                    fill="transparent"
                    r="45"
                    cx="50"
                    cy="50"
                />
                {/* Gradient for progress */}
                <defs>
                    <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10B981" /> 
                        <stop offset="50%" stopColor="#F59E0B" />
                        <stop offset="100%" stopColor="#EF4444" />
                    </linearGradient>
                </defs>
                {/* Progress indicator */}
                <circle
                    className={cn("transform -rotate-90 origin-center transition-all duration-500 ease-out")}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    stroke="url(#gaugeGradient)"
                    fill="transparent"
                    r="45"
                    cx="50"
                    cy="50"
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                <GaugeCircle className={cn("w-8 h-8 mb-1 transition-colors duration-300", getScoreColor(score))} />
                <span className={cn("text-5xl font-bold transition-colors duration-300 tracking-tighter", getScoreColor(score))}>
                    {percentage.toFixed(0)}
                </span>
                <span className="text-sm font-medium text-muted-foreground">Drowsiness</span>
            </div>
        </div>
    );
};


export default function MetricsGrid({ metrics }: { metrics: Metrics }) {
  return (
    <div className="grid grid-cols-2 gap-4">
        <Card className="col-span-2 flex items-center justify-center p-4 bg-card shadow-lg transition-all duration-300 hover:shadow-xl hover:border-primary/20">
            <DrowsinessGauge score={metrics.drowsinessScore} />
        </Card>
        
        <MetricCard 
            icon={<Eye className="w-7 h-7 text-blue-500"/>} 
            title="Blink Count" 
            value={metrics.blinkCount} 
            iconBgClass="bg-blue-500/10"
        />
        <MetricCard 
            icon={<Smile className="w-7 h-7 text-amber-500"/>} 
            title="Yawn Count" 
            value={metrics.yawnCount}
            iconBgClass="bg-amber-500/10"
        />
        <MetricCard 
            icon={<Percent className="w-7 h-7 text-violet-500"/>} 
            title="EAR" 
            value={metrics.ear.toFixed(2)}
            iconBgClass="bg-violet-500/10"
        />
        <MetricCard 
            icon={<Percent className="w-7 h-7 text-rose-500"/>} 
            title="MAR" 
            value={metrics.mar.toFixed(2)}
            iconBgClass="bg-rose-500/10"
        />
    </div>
  );
}
