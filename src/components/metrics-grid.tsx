"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Eye, HeartPulse, Wind, Smile, Clock, Timer } from "lucide-react";
import type { Metrics } from "./dashboard";

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  unit: string;
  description?: string;
}

function MetricCard({ icon, title, value, unit, description }: MetricCardProps) {
  return (
    <Card className="flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center justify-between">
          <span>{title}</span>
          <span className="text-muted-foreground">{icon}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{unit}</p>
        {description && <CardDescription className="mt-1">{description}</CardDescription>}
      </CardContent>
    </Card>
  );
}

interface MetricsGridProps {
  metrics: Metrics;
}

export default function MetricsGrid({ metrics }: MetricsGridProps) {
  return (
    <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="text-lg">Real-time Metrics</CardTitle>
            <CardDescription>Live data from the webcam feed.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard icon={<Eye />} title="Blink Count" value={metrics.blinkCount} unit="blinks" />
            <MetricCard icon={<Clock />} title="Blink Duration" value={metrics.blinkDuration.toFixed(2)} unit="seconds" />
            <MetricCard icon={<Smile />} title="Yawn Count" value={metrics.yawnCount} unit="yawns" />
            <MetricCard icon={<Timer />} title="Yawn Duration" value={metrics.yawnDuration.toFixed(2)} unit="seconds" />
            <MetricCard icon={<HeartPulse />} title="Heart Rate" value={metrics.heartRate} unit="BPM" />
            <MetricCard icon={<HeartPulse />} title="Pulse Rate" value={metrics.pulseRate} unit="BPM" />
            <MetricCard icon={<Wind />} title="Resp. Rate" value={metrics.respiratoryRate} unit="breaths/min" />
            <MetricCard icon={<div className="text-primary font-bold text-lg">{(metrics.drowsiness * 100).toFixed(0)}%</div>} title="Drowsiness" value={metrics.drowsiness > 0.7 ? 'High' : metrics.drowsiness > 0.4 ? 'Medium' : 'Low'} unit="level" />
        </CardContent>
    </Card>
  );
}
