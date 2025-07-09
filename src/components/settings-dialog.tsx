"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { Settings } from "./dashboard";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
}

export default function SettingsDialog({ open, onOpenChange, settings, onSettingsChange }: SettingsDialogProps) {
  
  const handleSave = () => {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Alert Settings</DialogTitle>
          <DialogDescription>
            Customize the thresholds for triggering alerts.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-3">
            <Label htmlFor="drowsiness" className="flex justify-between">
              <span>Drowsiness Threshold</span>
              <span>{settings.drowsinessThreshold.toFixed(2)}</span>
            </Label>
            <Slider
              id="drowsiness"
              value={[settings.drowsinessThreshold]}
              onValueChange={([value]) => onSettingsChange({ ...settings, drowsinessThreshold: value })}
              max={1}
              step={0.05}
            />
            <p className="text-sm text-muted-foreground">Alerts when drowsiness level exceeds this value.</p>
          </div>
          <div className="space-y-3">
            <Label htmlFor="eye-closure" className="flex justify-between">
              <span>Eye Closure Threshold (s)</span>
               <span>{settings.eyeClosureThreshold}s</span>
            </Label>
            <Slider
              id="eye-closure"
              value={[settings.eyeClosureThreshold]}
              onValueChange={([value]) => onSettingsChange({ ...settings, eyeClosureThreshold: value })}
              max={10}
              step={0.5}
            />
             <p className="text-sm text-muted-foreground">Alerts when eyes are closed for longer than this duration.</p>
          </div>
          <div className="space-y-3">
            <Label htmlFor="yawn-freq" className="flex justify-between">
                <span>Yawn Frequency (per min)</span>
                <span>{settings.yawnFrequencyThreshold}</span>
            </Label>
            <Slider
              id="yawn-freq"
              value={[settings.yawnFrequencyThreshold]}
              onValueChange={([value]) => onSettingsChange({ ...settings, yawnFrequencyThreshold: value })}
              max={20}
              step={1}
            />
            <p className="text-sm text-muted-foreground">Alerts when yawns per minute exceed this number.</p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
