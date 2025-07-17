"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Eye, Smile, Percent, GaugeCircle } from "lucide-react";
import type { Metrics } from "./dashboard";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  className?: string;
  iconBgClass?: string;
}

function MetricCard({ icon, title, value, className, iconBgClass }: MetricCardProps) {
  return (
    <Card className={cn("flex items-center p-4 shadow-sm hover:shadow-md transition-shadow bg-card", className)}>
      <div className={cn("p-3 rounded-full mr-4", iconBgClass)}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <p className="text-sm text-muted-foreground">{title}</p>
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
      if (s > 0.4) return "text-yellow-500"; // Yellow
      return "text-green-500"; // Green
    };

    const getTrackColor = (s: number) => {
        if (s > 0.75) return "stroke-destructive/20";
        if (s > 0.4) return "stroke-yellow-500/20";
        return "stroke-green-500/20";
    }

    const getIndicatorColor = (s: number) => {
        if (s > 0.75) return "stroke-destructive";
        if (s > 0.4) return "stroke-yellow-500";
        return "stroke-green-500";
    }

    return (
        <div className="relative flex items-center justify-center w-48 h-48">
            <svg className="w-full h-full" viewBox="0 0 100 100">
                {/* Background track */}
                <circle
                    className={cn("transform -rotate-90 origin-center transition-colors duration-300", getTrackColor(score))}
                    strokeWidth="8"
                    stroke="currentColor"
                    fill="transparent"
                    r="45"
                    cx="50"
                    cy="50"
                />
                {/* Progress indicator */}
                <circle
                    className={cn("transform -rotate-90 origin-center transition-all duration-500 ease-out", getIndicatorColor(score))}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="45"
                    cx="50"
                    cy="50"
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                <GaugeCircle className={cn("w-8 h-8 mb-1 transition-colors duration-300", getScoreColor(score))} />
                <span className={cn("text-4xl font-bold transition-colors duration-300", getScoreColor(score))}>
                    {percentage.toFixed(0)}
                </span>
                <span className="text-sm text-muted-foreground">Drowsiness</span>
            </div>
        </div>
    );
};


export default function MetricsGrid({ metrics }: MetricsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
        <Card className="col-span-2 flex items-center justify-center p-4 bg-card shadow-lg">
            <DrowsinessGauge score={metrics.drowsinessScore} />
        </Card>
        
        <MetricCard 
            icon={<Eye className="w-6 h-6 text-cyan-500"/>} 
            title="Blink Count" 
            value={metrics.blinkCount} 
            iconBgClass="bg-cyan-500/10"
        />
        <MetricCard 
            icon={<Smile className="w-6 h-6 text-amber-500"/>} 
            title="Yawn Count" 
            value={metrics.yawnCount}
            iconBgClass="bg-amber-500/10"
        />
        <MetricCard 
            icon={<Percent className="w-6 h-6 text-violet-500"/>} 
            title="EAR" 
            value={metrics.ear.toFixed(2)}
            iconBgClass="bg-violet-500/10"
        />
        <MetricCard 
            icon={<Percent className="w-6 h-6 text-rose-500"/>} 
            title="MAR" 
            value={metrics.mar.toFixed(2)}
            iconBgClass="bg-rose-500/10"
        />
    </div>
  );
}
