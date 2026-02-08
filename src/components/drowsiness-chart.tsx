"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from "recharts";
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
    <Card className="shadow-lg transition-all duration-300 hover:shadow-xl hover:border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg font-bold">Session Trend</CardTitle>
        <CardDescription>Live tracking of drowsiness and related metrics over time.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
            <AreaChart
              accessibilityLayer
              data={data}
              margin={{
                top: 5,
                right: 10,
                left: -10,
                bottom: 0,
              }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
              <defs>
                <linearGradient id="fillDrowsiness" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
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
                  cursor={{ stroke: 'hsl(var(--accent))', strokeWidth: 1, strokeDasharray: '3 3' }}
                  content={<ChartTooltipContent indicator="dot" />}
                  wrapperStyle={{ outline: 'none', border: 'none' }}
                  contentStyle={{
                      backgroundColor: 'hsl(var(--background) / 0.9)',
                      backdropFilter: 'blur(4px)',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                  }}
              />
              <Legend verticalAlign="top" height={40} />
              <ReferenceLine y={drowsinessThreshold} yAxisId="left" label={{ value: "Alert Threshold", position: 'insideBottomLeft', fill: 'hsl(var(--destructive))', fontSize: 10, fontWeight: 'bold' }} stroke="hsl(var(--destructive))" strokeWidth={2} strokeDasharray="3 3" />
              <Area
                yAxisId="left"
                dataKey="drowsiness"
                type="monotone"
                fill="url(#fillDrowsiness)"
                stroke="hsl(var(--chart-1))"
                strokeWidth={3}
                dot={false}
                name="Drowsiness"
              />
            </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
