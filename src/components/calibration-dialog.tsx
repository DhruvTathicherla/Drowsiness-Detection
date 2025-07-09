
"use client";

import { useState, useEffect, useRef } from "react";
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
  const [localMetrics, setLocalMetrics] = useState({ ear: 0, mar: 0 });
  const [cameraReady, setCameraReady] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  
  const earValues = useRef<number[]>([]);
  const marValues = useRef<number[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isCalibrating && cameraReady) {
      setProgress(0);
      earValues.current = [];
      marValues.current = [];

      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            setIsCalibrating(false);
            
            if(earValues.current.length > 0) {
                const avgEar = earValues.current.reduce((a, b) => a + b, 0) / earValues.current.length;
                // MAR baseline is less critical but good to have
                const avgMar = marValues.current.length > 0 ? marValues.current.reduce((a, b) => a + b, 0) / marValues.current.length : 0;
                setCalibrationData({ baselineEar: avgEar, baselineMar: avgMar });
                setIsDone(true);
                 toast({
                    title: "Calibration Successful!",
                    description: `Baseline EAR: ${avgEar.toFixed(2)}`,
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Calibration Failed",
                    description: "Could not detect facial features. Please try again.",
                });
                onOpenChange(false);
            }
            return 100;
          }
          if (localMetrics.ear > 0) { // Only need EAR for baseline
            earValues.current.push(localMetrics.ear);
            marValues.current.push(localMetrics.mar); 
          }
          return prev + (100 / 60); // ~3 seconds at 20fps
        });
      }, 50);
    }
    return () => clearInterval(timer);
  }, [isCalibrating, cameraReady, localMetrics, setCalibrationData, onOpenChange, toast]);
  
  useEffect(() => {
    // Reset component state when dialog is closed
    if(!open) {
      setIsCalibrating(false);
      setIsDone(false);
      setProgress(0);
      setCameraReady(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>System Calibration</DialogTitle>
          <DialogDescription>
            Calibrate the system to your unique facial features for improved accuracy.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center space-y-4 py-4">
           {open && (
              <WebcamFeed 
                isMonitoring={false} // Main dashboard monitoring is off
                isCalibrating={true} // Special calibration mode is on
                onMetricsUpdate={(m) => setLocalMetrics(m as any)}
                onCameraReady={setCameraReady}
                showOverlay={true} 
              />
           )}
            
            {isDone ? (
                <div className="text-center space-y-2">
                    <CheckCircle className="mx-auto h-12 w-12 text-green-500"/>
                    <p className="font-semibold text-lg">Calibration Complete!</p>
                </div>
            ) : (
                <div className="w-full space-y-2">
                    <Progress value={progress} />
                    <p className="text-center text-sm font-medium text-muted-foreground">
                        {isCalibrating ? "Calibrating... Please hold a neutral expression." : (cameraReady ? "Ready to start." : "Initializing camera...")}
                    </p>
                </div>
            )}
        </div>
        <DialogFooter className="sm:justify-center">
            {isDone ? (
                <Button onClick={() => onOpenChange(false)}>Close</Button>
            ) : (
                <Button onClick={() => setIsCalibrating(true)} disabled={isCalibrating || !cameraReady}>
                    {isCalibrating ? "Calibrating..." : "Start Calibration"}
                </Button>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
