"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { BarChart, Clock, Download, AlertTriangle, Activity, BrainCircuit, Sparkles, Loader2 } from "lucide-react"
import type { SummarizeSessionOutput } from "@/ai/schemas";

interface SummaryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  summaryData: {
    duration: number;
    totalBlinks: number;
    totalYawns: number;
    avgDrowsiness: number;
    alerts: number;
  } | null;
  aiSummary: SummarizeSessionOutput | null;
  onExport: () => void;
}

const StatCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) => (
    <div className="flex flex-col items-center justify-center space-y-1 rounded-lg bg-secondary p-3 text-center">
        <div className="text-muted-foreground">{icon}</div>
        <p className="text-xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
    </div>
)

const AISummarySection = ({ summary }: { summary: SummarizeSessionOutput }) => (
    <Card className="bg-secondary/50 border-primary/20">
        <CardHeader className="p-4">
            <CardTitle className="flex items-center gap-2 text-primary text-lg">
                <Sparkles className="w-5 h-5"/>
                AI Session Report
            </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3 text-sm">
            <p className="font-semibold text-base">"{summary.headline}"</p>
            <Separator />
            <div>
                <h4 className="flex items-center gap-2 font-semibold mb-1"><Activity className="w-4 h-4"/> Trends</h4>
                <p className="text-muted-foreground">{summary.trends}</p>
            </div>
            <div>
                <h4 className="flex items-center gap-2 font-semibold mb-1"><BrainCircuit className="w-4 h-4"/> Insights</h4>
                <p className="text-muted-foreground">{summary.insights}</p>
            </div>
        </CardContent>
    </Card>
);

export default function SessionSummaryDialog({ open, onOpenChange, summaryData, aiSummary, onExport }: SummaryDialogProps) {
  if (!summaryData) return null;
  
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">Session Summary</DialogTitle>
          <DialogDescription className="text-center">
            Here is a summary of your last monitoring session.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
            {aiSummary ? (
                <AISummarySection summary={aiSummary} />
            ) : (
                <div className="flex items-center justify-center p-8 rounded-lg bg-secondary/50">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin"/>
                    <p>Generating AI summary...</p>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <StatCard icon={<Clock/>} label="Duration" value={formatDuration(summaryData.duration)} />
                <StatCard icon={<AlertTriangle/>} label="Alerts" value={summaryData.alerts} />
                <StatCard icon={<BarChart/>} label="Avg. Drowsiness" value={`${(summaryData.avgDrowsiness * 100).toFixed(0)}%`} />
                <StatCard icon={<div className="font-mono text-lg">{summaryData.totalBlinks}/{summaryData.totalYawns}</div>} label="Blinks / Yawns" value="" />
            </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2">
          <Button onClick={onExport} variant="outline">
            <Download className="mr-2 h-4 w-4"/>
            Export Session Data
          </Button>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
