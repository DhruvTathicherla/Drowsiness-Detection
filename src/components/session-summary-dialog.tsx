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
import { BarChart, Clock, Download, AlertTriangle } from "lucide-react"

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
  onExport: () => void;
}

const StatCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) => (
    <div className="flex flex-col items-center justify-center space-y-1 rounded-lg bg-secondary p-4 text-center">
        <div className="text-muted-foreground">{icon}</div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
    </div>
)

export default function SessionSummaryDialog({ open, onOpenChange, summaryData, onExport }: SummaryDialogProps) {
  if (!summaryData) return null;
  
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">Session Summary</DialogTitle>
          <DialogDescription className="text-center">
            Here is a summary of your last monitoring session.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
            <StatCard icon={<Clock/>} label="Duration" value={formatDuration(summaryData.duration)} />
            <StatCard icon={<AlertTriangle/>} label="Alerts" value={summaryData.alerts} />
            <StatCard icon={<BarChart/>} label="Avg. Drowsiness" value={`${(summaryData.avgDrowsiness * 100).toFixed(0)}%`} />
            <StatCard icon={<div className="font-mono text-lg">{summaryData.totalBlinks}/{summaryData.totalYawns}</div>} label="Blinks / Yawns" value="" />
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
