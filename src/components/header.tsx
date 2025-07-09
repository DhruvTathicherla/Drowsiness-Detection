"use client";

import { Button } from "@/components/ui/button";
import { Play, Square, Scaling, Settings, Download, ShieldCheck } from "lucide-react";

interface HeaderProps {
  isMonitoring: boolean;
  onToggleMonitoring: () => void;
  onCalibrate: () => void;
  onOpenSettings: () => void;
  onExport: () => void;
}

const Logo = () => (
    <svg width="32" height="32" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="text-primary">
      <path d="M50 10 C 20 10, 10 40, 10 50 C 10 60, 20 90, 50 90 C 80 90, 90 60, 90 50 C 90 40, 80 10, 50 10 z M 50 30 A 20 20 0 1 1 50 70 A 20 20 0 1 1 50 30 z" fill="currentColor"/>
      <circle cx="50" cy="50" r="10" className="text-accent" fill="currentColor" />
    </svg>
  );

export default function Header({ isMonitoring, onToggleMonitoring, onCalibrate, onOpenSettings, onExport }: HeaderProps) {
  return (
    <header className="flex items-center justify-between p-4 border-b bg-card">
      <div className="flex items-center gap-3">
        <Logo />
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Vigilance AI</h1>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onCalibrate}>
          <Scaling />
          <span className="hidden md:inline ml-2">Calibrate</span>
        </Button>
        <Button variant="outline" size="sm" onClick={onOpenSettings}>
          <Settings />
          <span className="hidden md:inline ml-2">Settings</span>
        </Button>
        <Button variant="outline" size="sm" onClick={onExport} disabled={!isMonitoring}>
          <Download />
          <span className="hidden md:inline ml-2">Export</span>
        </Button>
        <Button size="sm" onClick={onToggleMonitoring} className="w-28">
          {isMonitoring ? <Square className="mr-2" /> : <Play className="mr-2" />}
          {isMonitoring ? "Stop" : "Start"}
        </Button>
      </div>
    </header>
  );
}
