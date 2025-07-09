"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { CheckCircle } from "lucide-react";

interface CalibrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CalibrationDialog({ open, onOpenChange }: CalibrationDialogProps) {
  const [progress, setProgress] = useState(0);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isCalibrating) {
      setProgress(0);
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            setIsCalibrating(false);
            setIsDone(true);
            return 100;
          }
          return prev + 1;
        });
      }, 50);
    }
    return () => clearInterval(timer);
  }, [isCalibrating]);
  
  useEffect(() => {
    if(!open) {
        // Reset state on close
        setIsCalibrating(false);
        setIsDone(false);
        setProgress(0);
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
        <div className="flex flex-col items-center justify-center space-y-4 py-8">
            {isDone ? (
                <div className="text-center space-y-2">
                    <CheckCircle className="mx-auto h-16 w-16 text-green-500"/>
                    <p className="font-semibold text-lg">Calibration Complete!</p>
                    <p className="text-muted-foreground">The system is now optimized for you.</p>
                </div>
            ) : (
                <>
                <p className="text-center text-muted-foreground">
                    Please look directly at the camera and maintain a neutral expression.
                </p>
                <div className="w-full space-y-2">
                    <Progress value={progress} />
                    <p className="text-center text-sm font-medium">{isCalibrating ? "Calibrating..." : "Ready to start"}</p>
                </div>
                </>
            )}
        </div>
        <DialogFooter className="sm:justify-center">
            {isDone ? (
                <Button onClick={() => onOpenChange(false)}>Close</Button>
            ) : (
                <Button onClick={() => setIsCalibrating(true)} disabled={isCalibrating}>
                    {isCalibrating ? "Calibrating..." : "Start Calibration"}
                </Button>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
