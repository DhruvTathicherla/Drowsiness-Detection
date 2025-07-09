"use client";

import * as React from "react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ReferenceLine } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { DrowsinessDataPoint } from "./dashboard";

const chartConfig = {
  drowsiness: {
    label: "Drowsiness Score",
    color: "hsl(var(--chart-1))",
  },
  blinks: {
    label: "Total Blinks",
    color: "hsl(var(--chart-2))",
  },
  yawns: {
    label: "Total Yawns",
    color: "hsl(var(--chart-3))",
  }
} satisfies ChartConfig;

interface DrowsinessChartProps {
  data: DrowsinessDataPoint[];
  drowsinessThreshold: number;
}

export default function DrowsinessChart({ data, drowsinessThreshold }: DrowsinessChartProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg">Session Trend</CardTitle>
        <CardDescription>Live tracking of drowsiness and related metrics over time.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
          <LineChart
            accessibilityLayer
            data={data}
            margin={{
              top: 5,
              right: 10,
              left: -10,
              bottom: 0,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis
              yAxisId="left"
              dataKey="drowsiness"
              domain={[0, 1]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickCount={6}
              tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
              stroke="hsl(var(--chart-1))"
            />
             <YAxis
              yAxisId="right"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickCount={5}
              stroke="hsl(var(--chart-2))"
            />
            <Tooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
                wrapperStyle={{ outline: 'none', border: 'none' }}
                contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                }}
            />
            <Legend verticalAlign="top" height={40} />
            <ReferenceLine y={drowsinessThreshold} yAxisId="left" label={{ value: "Alert Threshold", position: 'insideBottomLeft', fill: 'hsl(var(--destructive))', fontSize: 10 }} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
            <Line
              yAxisId="left"
              dataKey="drowsiness"
              type="monotone"
              stroke="var(--color-drowsiness)"
              strokeWidth={3}
              dot={false}
              name="Drowsiness"
            />
            <Line
              yAxisId="right"
              dataKey="blinks"
              type="step"
              stroke="var(--color-blinks)"
              strokeWidth={2}
              dot={false}
              name="Blinks"
              opacity={0.6}
            />
             <Line
              yAxisId="right"
              dataKey="yawns"
              type="step"
              stroke="var(--color-yawns)"
              strokeWidth={2}
              dot={false}
              name="Yawns"
              opacity={0.6}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
