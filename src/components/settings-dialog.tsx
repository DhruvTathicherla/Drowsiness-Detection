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
import { Switch } from "@/components/ui/switch";
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
            Customize the thresholds and preferences for triggering alerts.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-3">
            <Label htmlFor="drowsiness" className="flex justify-between">
              <span>Drowsiness Threshold</span>
              <span className="font-mono text-primary">{settings.drowsinessThreshold.toFixed(2)}</span>
            </Label>
            <Slider
              id="drowsiness"
              value={[settings.drowsinessThreshold]}
              onValueChange={([value]) => onSettingsChange({ ...settings, drowsinessThreshold: value })}
              max={1}
              step={0.05}
            />
            <p className="text-sm text-muted-foreground">Alerts when AI confidence in drowsiness exceeds this value.</p>
          </div>
          <div className="space-y-3">
            <Label htmlFor="yawn-freq" className="flex justify-between">
                <span>Yawn Frequency (per min)</span>
                <span className="font-mono text-primary">{settings.yawnFrequencyThreshold}</span>
            </Label>
            <Slider
              id="yawn-freq"
              value={[settings.yawnFrequencyThreshold]}
              onValueChange={([value]) => onSettingsChange({ ...settings, yawnFrequencyThreshold: value })}
              max={20}
              step={1}
            />
            <p className="text-sm text-muted-foreground">Considered by the AI model for drowsiness analysis.</p>
          </div>
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="audible-alerts" className="flex flex-col space-y-1">
              <span>Audible Alerts</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Play a sound when a drowsiness alert is triggered.
              </span>
            </Label>
            <Switch
              id="audible-alerts"
              checked={settings.audibleAlerts}
              onCheckedChange={(checked) => onSettingsChange({ ...settings, audibleAlerts: checked })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
