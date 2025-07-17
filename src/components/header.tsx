
"use client";

import { Button } from "@/components/ui/button";
import { Play, Square, Scaling, Settings, Download, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

interface HeaderProps {
  isMonitoring: boolean;
  onToggleMonitoring: () => void;
  onCalibrate: () => void;
  onOpenSettings: () => void;
  onExport: () => void;
  isExportDisabled: boolean;
}
  
export default function Header({ isMonitoring, onToggleMonitoring, onCalibrate, onOpenSettings, onExport, isExportDisabled }: HeaderProps) {
  const { setTheme, theme } = useTheme();

  return (
    <header className="flex items-center justify-between p-4 border-b bg-card shadow-sm sticky top-0 z-40 overflow-hidden">
      <div className="flex items-center gap-3">
        <div className="logo-container">
            <div className="logo-bounce w-8 h-8 relative">
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="text-primary w-full h-full">
                    <path d="M50 10 C 20 10, 10 40, 10 50 C 10 60, 20 90, 50 90 C 80 90, 90 60, 90 50 C 90 40, 80 10, 50 10 z" fill="currentColor"/>
                    <g className="logo-blink">
                        <circle cx="50" cy="50" r="12" className="text-accent dark:text-background" fill="currentColor" />
                        <circle cx="50" cy="50" r="5" className="text-foreground/70" fill="currentColor" />
                    </g>
                </svg>
            </div>
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Vigilance AI</h1>
      </div>
      <div className="flex items-center gap-2">
         <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
        </Button>
        <Button variant="outline" size="sm" onClick={onCalibrate}>
          <Scaling />
          <span className="hidden md:inline ml-2">Calibrate</span>
        </Button>
        <Button variant="outline" size="sm" onClick={onOpenSettings}>
          <Settings />
          <span className="hidden md:inline ml-2">Settings</span>
        </Button>
        <Button variant="outline" size="sm" onClick={onExport} disabled={isExportDisabled}>
          <Download />
          <span className="hidden md:inline ml-2">Export</span>
        </Button>
        <Button size="sm" onClick={onToggleMonitoring} className="w-28 bg-primary hover:bg-primary/90 text-primary-foreground">
          {isMonitoring ? <Square className="mr-2" /> : <Play className="mr-2" />}
          {isMonitoring ? "Stop" : "Start"}
        </Button>
      </div>
    </header>
  );
}
