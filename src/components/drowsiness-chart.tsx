"use client";

import * as React from "react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { DrowsinessDataPoint } from "./dashboard";

const chartConfig = {
  drowsiness: {
    label: "Drowsiness",
    color: "hsl(var(--chart-1))",
  },
  blinkYawnRatio: {
    label: "Blinks / Yawns",
    color: "hsl(var(--chart-2))",
  }
} satisfies ChartConfig;

interface DrowsinessChartProps {
  data: DrowsinessDataPoint[];
}

export default function DrowsinessChart({ data }: DrowsinessChartProps) {
  const chartData = React.useMemo(() => data.map(point => ({
    ...point,
    blinkYawnRatio: point.yawns > 0 ? parseFloat((point.blinks / point.yawns).toFixed(2)) : 0,
  })), [data]);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg">Drowsiness Trend</CardTitle>
        <CardDescription>Estimated drowsiness level and blink/yawn ratio over time.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              yAxisId="left"
              dataKey="drowsiness"
              domain={[0, 1]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              stroke="var(--color-drowsiness)"
            />
             <YAxis
              yAxisId="right"
              dataKey="blinkYawnRatio"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              stroke="var(--color-blinkYawnRatio)"
            />
            <Tooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
            <Legend verticalAlign="top" height={36} />
            <Line
              yAxisId="left"
              dataKey="drowsiness"
              type="monotone"
              stroke="var(--color-drowsiness)"
              strokeWidth={2}
              dot={false}
              name="Drowsiness"
            />
            <Line
              yAxisId="right"
              dataKey="blinkYawnRatio"
              type="monotone"
              stroke="var(--color-blinkYawnRatio)"
              strokeWidth={2}
              dot={false}
              name="Blinks / Yawns"
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
