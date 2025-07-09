"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Header from "@/components/header";
import WebcamFeed from "@/components/webcam-feed";
import DrowsinessAnalysis from "@/components/drowsiness-analysis";
import MetricsGrid from "@/components/metrics-grid";
import DrowsinessChart from "@/components/drowsiness-chart";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import SettingsDialog from "@/components/settings-dialog";
import CalibrationDialog from "./calibration-dialog";

export interface Metrics {
  blinkCount: number;
  blinkDuration: number;
  yawnCount: number;
  yawnDuration: number;
  heartRate: number;
  pulseRate: number;
  respiratoryRate: number;
  drowsiness: number;
}

export interface DrowsinessDataPoint {
  time: string;
  drowsiness: number;
  blinks: number;
  yawns: number;
}

export interface Settings {
  drowsinessThreshold: number;
  eyeClosureThreshold: number;
  yawnFrequencyThreshold: number;
}

export default function Dashboard() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [metrics, setMetrics] = useState<Metrics>({
    blinkCount: 0,
    blinkDuration: 0,
    yawnCount: 0,
    yawnDuration: 0,
    heartRate: 75,
    pulseRate: 75,
    respiratoryRate: 16,
    drowsiness: 0,
  });
  const [drowsinessHistory, setDrowsinessHistory] = useState<DrowsinessDataPoint[]>([]);
  const [showAlert, setShowAlert] = useState(false);
  const [showYawnAlert, setShowYawnAlert] = useState(false);
  const [alertHasBeenTriggered, setAlertHasBeenTriggered] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCalibration, setShowCalibration] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    drowsinessThreshold: 0.7,
    eyeClosureThreshold: 3,
    yawnFrequencyThreshold: 5,
  });
  const [isClient, setIsClient] = useState(false);

  const sessionStartTime = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Effect for simulating non-vision metrics
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (isMonitoring) {
      interval = setInterval(() => {
        setMetrics(prev => ({
          ...prev,
          heartRate: 65 + Math.floor(Math.random() * 15),
          pulseRate: prev.heartRate + Math.floor(Math.random() * 5) - 2,
          respiratoryRate: 12 + Math.floor(Math.random() * 6),
        }));
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isMonitoring]);

  const handleMetricsUpdate = useCallback((newMetricsData: Partial<Metrics>) => {
    setMetrics(prevMetrics => {
        const updatedMetrics = { ...prevMetrics, ...newMetricsData };

        const elapsedSeconds = ((Date.now() - (sessionStartTime.current ?? Date.now())) / 1000) || 1;
        const yawnsPerMinute = (updatedMetrics.yawnCount / elapsedSeconds) * 60;
        
        let drowsinessScore = 0;
        if (yawnsPerMinute > settings.yawnFrequencyThreshold) {
          drowsinessScore += 0.4;
        }
        if (updatedMetrics.blinkDuration > 0.4) {
            drowsinessScore += 0.3;
        }
        drowsinessScore += (updatedMetrics.yawnCount / 10);
        updatedMetrics.drowsiness = Math.min(1, parseFloat(drowsinessScore.toFixed(2)));
        
        return updatedMetrics;
    });
  }, [settings.yawnFrequencyThreshold]);

  // Effect to update drowsiness history whenever key metrics change
  useEffect(() => {
    if (!isMonitoring) return;

    setDrowsinessHistory(prevHistory => {
        const now = new Date();
        const newPoint: DrowsinessDataPoint = {
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit'}),
          drowsiness: metrics.drowsiness,
          blinks: metrics.blinkCount,
          yawns: metrics.yawnCount,
        };
        const newHistory = [...prevHistory, newPoint];
        return newHistory.length > 30 ? newHistory.slice(1) : newHistory;
    });
  // Using individual metrics as dependencies is more efficient than the whole object
  }, [isMonitoring, metrics.blinkCount, metrics.drowsiness, metrics.yawnCount]);


  // Effect to handle showing the alert, preventing re-render loops
  useEffect(() => {
    if (isMonitoring && metrics.drowsiness > settings.drowsinessThreshold && !alertHasBeenTriggered) {
      setShowAlert(true);
      setAlertHasBeenTriggered(true);
    }
  }, [isMonitoring, metrics.drowsiness, settings.drowsinessThreshold, alertHasBeenTriggered]);

  // Effect to handle yawn count alert
  useEffect(() => {
    if (isMonitoring && metrics.yawnCount > 5) {
      setShowYawnAlert(true);
      audioRef.current?.play().catch(e => console.error("Error playing sound:", e));
      setMetrics(prev => ({ ...prev, yawnCount: 0 }));
    }
  }, [isMonitoring, metrics.yawnCount]);
  
  const handleToggleMonitoring = () => {
    setIsMonitoring(prev => {
      const newIsMonitoring = !prev;
      if (newIsMonitoring) {
        sessionStartTime.current = Date.now();
        setMetrics({
          blinkCount: 0,
          blinkDuration: 0,
          yawnCount: 0,
          yawnDuration: 0,
          heartRate: 75,
          pulseRate: 75,
          respiratoryRate: 16,
          drowsiness: 0,
        });
        setDrowsinessHistory([]);
        setShowAlert(false);
        setAlertHasBeenTriggered(false);
        setShowYawnAlert(false);
      } else {
        sessionStartTime.current = null;
      }
      return newIsMonitoring;
    });
  };
  
  const handleExport = () => {
    const headers = ["time", "drowsiness_level", "blink_count", "yawn_count", "heart_rate", "respiratory_rate"];
    const rows = drowsinessHistory.map(h => [h.time, h.drowsiness, metrics.blinkCount, metrics.yawnCount, metrics.heartRate, metrics.respiratoryRate].join(','));
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "vigilance_ai_session.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
      <Header
        isMonitoring={isMonitoring}
        onToggleMonitoring={handleToggleMonitoring}
        onCalibrate={() => setShowCalibration(true)}
        onOpenSettings={() => setShowSettings(true)}
        onExport={handleExport}
      />
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 flex flex-col gap-6">
            {isClient && <WebcamFeed isMonitoring={isMonitoring} onMetricsUpdate={handleMetricsUpdate} />}
            <DrowsinessAnalysis />
          </div>
          <div className="lg:col-span-2 flex flex-col gap-6">
            <MetricsGrid metrics={metrics} />
            <DrowsinessChart data={drowsinessHistory} />
          </div>
        </div>
      </main>

      {/* Drowsiness Alert */}
      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent className="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
              Drowsiness Alert!
            </AlertDialogTitle>
            <AlertDialogDescription>
              High level of drowsiness detected. Please consider taking a short break to ensure your safety.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowAlert(false)}>Dismiss</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Yawn Alert */}
      <AlertDialog open={showYawnAlert} onOpenChange={setShowYawnAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
              Yawn Alert!
            </AlertDialogTitle>
            <AlertDialogDescription>
              Excessive yawning detected. This is a strong indicator of drowsiness.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowYawnAlert(false)}>Dismiss</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        settings={settings}
        onSettingsChange={setSettings}
      />
      <CalibrationDialog
        open={showCalibration}
        onOpenChange={setShowCalibration}
      />

      <audio ref={audioRef} src="https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg" preload="auto"></audio>
    </div>
  );
}
