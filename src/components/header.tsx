
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
    <header className="flex items-center justify-between p-4 border-b bg-card shadow-sm sticky top-0 z-40 overflow-x-clip">
      <div className="flex items-center gap-3">
        <div className="logo-container">
            <div className="logo-bounce w-10 h-10 relative">
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="text-primary w-full h-full drop-shadow-lg">
                    <path fill="currentColor" d="M99.3,47.6C95.2,21,78.2,3.3,51.8,0.7c-2.3-0.2-4.2,1.6-4.2,3.9v0c0,1.9,1.4,3.6,3.3,4c19.7,2.9,33.3,16.2,36.9,34.8c0.6,2.9,3.6,4.6,6.4,3.9C97.1,56.5,99.9,52.3,99.3,47.6z M48.2,99.3C21.8,96.7,4.8,79,0.7,52.4C0.1,47.7,2.9,43.5,6.7,42.7c2.9-0.6,5.8,1.1,6.4,3.9c3.6,18.6,17.2,31.9,36.9,34.8c1.9,0.3,3.3,2,3.3,4v0C53.3,97.7,50.5,99.5,48.2,99.3z"/>
                    <g className="logo-blink">
                      <circle cx="50" cy="50" r="14" className="text-accent dark:text-background" fill="currentColor" />
                      <circle cx="50" cy="50" r="6" className="text-foreground/70" fill="currentColor" />
                    </g>
                </svg>
            </div>
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground pl-12">Drishti AI</h1>
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
        <Button size="sm" onClick={onToggleMonitoring} className="w-28 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-shadow">
          {isMonitoring ? <Square className="mr-2" /> : <Play className="mr-2" />}
          {isMonitoring ? "Stop" : "Start"}
        </Button>
      </div>
    </header>
  );
}
