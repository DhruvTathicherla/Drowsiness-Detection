
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { CheckCircle } from "lucide-react";
import WebcamFeed from "./webcam-feed";
import { useToast } from "@/hooks/use-toast";
import type { CalibrationData } from "./dashboard";

interface CalibrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setCalibrationData: (data: CalibrationData) => void;
}

export default function CalibrationDialog({ open, onOpenChange, setCalibrationData }: CalibrationDialogProps) {
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  
  const metricsBuffer = useRef<{ ear: number; mar: number }[]>([]);
  const { toast } = useToast();

  const handleMetricsUpdate = useCallback((metrics: { ear: number, mar: number }) => {
    if (isCalibrating) {
        if(metrics.ear > 0 && metrics.mar > 0) { // Only store valid readings
            metricsBuffer.current.push(metrics);
        }
    }
  }, [isCalibrating]);
  
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
            
            if (metricsBuffer.current.length > 10) { // Ensure we have enough samples
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
            return 100;
          }
          return prev + 5; // 5% per 250ms = 5 seconds total
        });
      }, 250);
    }
    return () => clearInterval(timer);
  }, [isCalibrating, setCalibrationData, onOpenChange, toast]);
  
  useEffect(() => {
    // Reset component state when dialog is closed or opened
    if(!open) {
      setTimeout(() => { // Delay reset to allow closing animation
        setIsCalibrating(false);
        setIsDone(false);
        setProgress(0);
        setCameraReady(false);
        metricsBuffer.current = [];
      }, 300);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>System Calibration</DialogTitle>
          <DialogDescription>
            Hold a neutral expression and look at the camera for a few seconds.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center space-y-4 py-4">
            <WebcamFeed 
                isActive={open} // Webcam is active whenever the dialog is open
                isMonitoring={false} // Not for blink/yawn counting
                onMetricsUpdate={handleMetricsUpdate}
                onCameraReady={setCameraReady}
                showOverlay={true} 
                title="Calibration Feed"
                description="Position your face in the center."
            />
            
            {isDone ? (
                <div className="text-center space-y-2">
                    <CheckCircle className="mx-auto h-12 w-12 text-green-500"/>
                    <p className="font-semibold text-lg">Calibration Complete!</p>
                </div>
            ) : (
                <div className="w-full space-y-2">
                    <Progress value={progress} />
                    <p className="text-center text-sm font-medium text-muted-foreground">
                        {isCalibrating ? "Calibrating... Please hold still." : (cameraReady ? "Ready to begin." : "Waiting for camera...")}
                    </p>
                </div>
            )}
        </div>
        <DialogFooter className="sm:justify-center">
            {isDone ? (
                <Button onClick={() => onOpenChange(false)}>Close</Button>
            ) : (
                <Button onClick={startCalibration} disabled={isCalibrating || !cameraReady}>
                    {isCalibrating ? "Calibrating..." : "Start Calibration"}
                </Button>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
