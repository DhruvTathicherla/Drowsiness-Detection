
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { CalibrationData, Metrics } from "./dashboard";

interface CalibrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setCalibrationData: (data: CalibrationData) => void;
  liveMetrics: Metrics;
}

export default function CalibrationDialog({ open, onOpenChange, setCalibrationData, liveMetrics }: CalibrationDialogProps) {
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  
  const metricsBuffer = useRef<{ ear: number; mar: number }[]>([]);
  const { toast } = useToast();
  
  const startCalibration = () => {
    setProgress(0);
    setIsDone(false);
    metricsBuffer.current = [];
    setIsCalibrating(true);
  };
  
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isCalibrating) {
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            setIsCalibrating(false);
            return 100;
          }
          return prev + 5;
        });
      }, 250);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isCalibrating]);

  useEffect(() => {
    if (isCalibrating && liveMetrics.ear > 0 && liveMetrics.mar > 0) {
      metricsBuffer.current.push({ ear: liveMetrics.ear, mar: liveMetrics.mar });
    }
  }, [isCalibrating, liveMetrics]);


  useEffect(() => {
    if (!isCalibrating && progress === 100) {
      if (metricsBuffer.current.length > 10) {
          const avgEar = metricsBuffer.current.reduce((sum, m) => sum + m.ear, 0) / metricsBuffer.current.length;
          const avgMar = metricsBuffer.current.reduce((sum, m) => sum + m.mar, 0) / metricsBuffer.current.length;
          
          setCalibrationData({ baselineEar: avgEar, baselineMar: avgMar });
          setIsDone(true);
          toast({
              title: "Calibration Successful!",
              description: `Baseline EAR set to ${avgEar.toFixed(2)}`,
          });
      } else {
          toast({
            variant: "destructive",
            title: "Calibration Failed",
            description: "Could not detect facial features clearly. Please try again in better lighting.",
          });
          onOpenChange(false); // Close dialog on failure
      }
    }
  }, [isCalibrating, progress, setCalibrationData, toast, onOpenChange]);
  
  useEffect(() => {
    // Reset state when dialog is closed
    if (!open) {
      setTimeout(() => {
        setIsCalibrating(false);
        setIsDone(false);
        setProgress(0);
        metricsBuffer.current = [];
      }, 300); // Delay to allow for exit animation
    }
  }, [open]);

  const canStart = liveMetrics.ear > 0 && liveMetrics.mar > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>System Calibration</DialogTitle>
          <DialogDescription>
            Hold a neutral expression and look at the camera. Press start when ready.
          </Description>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center space-y-4 py-4">
            <div className="w-full aspect-video bg-secondary rounded-lg flex flex-col items-center justify-center text-muted-foreground">
                <Camera className="w-16 h-16 mb-2"/>
                <p className="font-semibold">Using Main Camera Feed</p>
                <p className="text-sm">Your face will be analyzed for calibration.</p>
            </div>
            
            {isDone ? (
                <div className="text-center space-y-2">
                    <CheckCircle className="mx-auto h-12 w-12 text-green-500"/>
                    <p className="font-semibold text-lg">Calibration Complete!</p>
                </div>
            ) : (
                <div className="w-full space-y-2">
                    <Progress value={progress} />
                    <p className="text-center text-sm font-medium text-muted-foreground">
                        {isCalibrating ? "Calibrating... Please hold still." : (canStart ? "Ready to begin calibration." : "Waiting for camera...")}
                    </p>
                </div>
            )}
        </div>
        <DialogFooter className="sm:justify-center">
            {isDone ? (
                <Button onClick={() => onOpenChange(false)}>Close</Button>
            ) : (
                <Button onClick={startCalibration} disabled={isCalibrating || !canStart}>
                    {isCalibrating ? "Calibrating..." : "Start Calibration"}
                </Button>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
