
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
import { BarChart, Clock, Download, AlertTriangle, Activity, BrainCircuit, Sparkles, Loader2, Eye, Smile } from "lucide-react"
import type { SummarizeSessionOutput } from "@/ai/schemas";
import { cn } from "@/lib/utils";

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

const StatCard = ({ icon, label, value, className }: { icon: React.ReactNode, label: string, value: string | number, className?: string }) => (
    <div className={cn("flex flex-col items-center justify-center space-y-1 rounded-lg bg-secondary/80 p-4 text-center shadow-inner transition-colors hover:bg-secondary", className)}>
        <div className="text-muted-foreground">{icon}</div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">{label}</p>
    </div>
)

const AISummarySection = ({ summary }: { summary: SummarizeSessionOutput }) => (
    <Card className="bg-gradient-to-br from-primary/10 via-card to-accent/10 border-primary/20 shadow-lg">
        <CardHeader className="p-4">
            <CardTitle className="flex items-center gap-2 text-primary text-lg">
                <Sparkles className="w-5 h-5"/>
                AI Session Report
            </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-4 text-sm">
            <p className="font-semibold text-base italic leading-relaxed text-center p-2 bg-primary/10 rounded-md">"{summary.headline}"</p>
            <Separator />
            <div>
                <h4 className="flex items-center gap-2 font-semibold mb-2 text-base"><Activity className="w-5 h-5"/> Trends</h4>
                <p className="text-muted-foreground pl-2 border-l-2 border-accent">{summary.trends}</p>
            </div>
            <div>
                <h4 className="flex items-center gap-2 font-semibold mb-2 text-base"><BrainCircuit className="w-5 h-5"/> Insights</h4>
                <p className="text-muted-foreground pl-2 border-l-2 border-accent">{summary.insights}</p>
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
          <DialogTitle className="text-center text-2xl font-bold tracking-tight">Session Summary</DialogTitle>
          <DialogDescription className="text-center">
            Here is a summary of your last monitoring session.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
            {aiSummary ? (
                <AISummarySection summary={aiSummary} />
            ) : (
                <div className="flex items-center justify-center p-8 rounded-lg bg-secondary/50 h-[200px]">
                    <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary"/>
                    <p className="text-lg font-medium">Generating AI summary...</p>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <StatCard icon={<Clock className="w-6 h-6"/>} label="Duration" value={formatDuration(summaryData.duration)} />
                <StatCard icon={<AlertTriangle className="w-6 h-6"/>} label="Alerts" value={summaryData.alerts} />
                <StatCard icon={<BarChart className="w-6 h-6"/>} label="Avg. Drowsiness" value={`${(summaryData.avgDrowsiness * 100).toFixed(0)}%`} />
                <StatCard 
                    icon={<div className="flex gap-2"><Eye className="w-5 h-5" /><Smile className="w-5 h-5" /></div>}
                    label="Blinks / Yawns" 
                    value={`${summaryData.totalBlinks} / ${summaryData.totalYawns}`} 
                />
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
