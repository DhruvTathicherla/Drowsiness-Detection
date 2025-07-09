"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Eye, Smile, Percent } from "lucide-react";
import type { Metrics } from "./dashboard";
import {
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts"

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  unit: string;
  description?: string;
}

function MetricCard({ icon, title, value, unit }: MetricCardProps) {
  return (
    <Card className="flex flex-col justify-center text-center shadow-sm hover:shadow-md transition-shadow bg-card">
      <CardHeader className="p-2 pb-0">
         <div className="text-muted-foreground mx-auto">{icon}</div>
      </CardHeader>
      <CardContent className="p-2 pt-1">
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{title}</p>
      </CardContent>
    </Card>
  );
}

interface MetricsGridProps {
  metrics: Metrics;
}

const DrowsinessGauge = ({ score }: { score: number }) => {
  const data = [{ subject: "Drowsiness", value: score * 100, fullMark: 100 }];
  const color = score > 0.75 ? "hsl(var(--destructive))" : score > 0.5 ? "hsl(var(--chart-4))" : "hsl(var(--chart-1))";

  return (
    <ResponsiveContainer width="100%" height={150}>
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
        <PolarGrid gridType="circle" />
        <PolarAngleAxis dataKey="subject" tick={false} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} axisLine={false} tick={false} />
        <Radar name="Drowsiness" dataKey="value" stroke={color} fill={color} fillOpacity={0.6} />
      </RadarChart>
    </ResponsiveContainer>
  );
};

export default function MetricsGrid({ metrics }: MetricsGridProps) {
  return (
    <Card className="shadow-lg">
        <CardHeader className="pb-2">
            <CardTitle className="text-lg">Real-time Metrics</CardTitle>
            <CardDescription>Live data from the webcam feed.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
            <Card className="col-span-2 shadow-sm hover:shadow-md transition-shadow text-center p-2 bg-card">
                <DrowsinessGauge score={metrics.drowsinessScore} />
                <div className="text-4xl font-bold -mt-8">{(metrics.drowsinessScore * 100).toFixed(0)}%</div>
                <p className="text-sm text-muted-foreground">Drowsiness Score</p>
            </Card>
            <MetricCard icon={<Eye className="w-6 h-6"/>} title="Blink Count" value={metrics.blinkCount} unit="blinks" />
            <MetricCard icon={<Smile className="w-6 h-6"/>} title="Yawn Count" value={metrics.yawnCount} unit="yawns" />
            <MetricCard icon={<Percent className="w-6 h-6"/>} title="EAR" value={metrics.ear.toFixed(2)} unit="ratio" />
            <MetricCard icon={<Percent className="w-6 h-6"/>} title="MAR" value={metrics.mar.toFixed(2)} unit="ratio" />
        </CardContent>
    </Card>
  );
}
