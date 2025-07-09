
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
import SessionSummaryDialog from "./session-summary-dialog";
import { drowsinessAnalysis } from "@/app/actions";
import type { DrowsinessAnalysisInput, type DrowsinessAnalysisOutput } from "@/ai/flows/drowsiness-analysis";
import { Siren } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface Metrics {
  blinkCount: number;
  blinkDuration: number;
  yawnCount: number;
  yawnDuration: number;
  ear: number;
  mar: number;
  drowsinessScore: number;
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
  audibleAlerts: boolean;
}

export interface CalibrationData {
    baselineEar: number | null;
    baselineMar: number | null;
}

interface EventTimestamp {
    time: number;
}

export default function Dashboard() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [metrics, setMetrics] = useState<Metrics>({
    blinkCount: 0,
    blinkDuration: 0,
    yawnCount: 0,
    yawnDuration: 0,
    ear: 0,
    mar: 0,
    drowsinessScore: 0,
  });
  const [aiAnalysis, setAiAnalysis] = useState<DrowsinessAnalysisOutput | null>(null);
  const [drowsinessHistory, setDrowsinessHistory] = useState<DrowsinessDataPoint[]>([]);
  const [showAlert, setShowAlert] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCalibration, setShowCalibration] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionSummaryData, setSessionSummaryData] = useState<any>(null);
  const [settings, setSettings] = useState<Settings>({
    drowsinessThreshold: 0.75,
    eyeClosureThreshold: 3,
    yawnFrequencyThreshold: 4,
    audibleAlerts: true,
  });
  const [calibrationData, setCalibrationData] = useState<CalibrationData>({ baselineEar: null, baselineMar: null });
  const [isClient, setIsClient] = useState(false);
  
  const { toast } = useToast();
  const sessionStartTime = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analysisTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastAlertTime = useRef<number>(0);
  
  const blinkHistoryRef = useRef<EventTimestamp[]>([]);
  const yawnHistoryRef = useRef<EventTimestamp[]>([]);
  const ROLLING_WINDOW_SECONDS = 60;

  useEffect(() => {
    setIsClient(true);
    if (typeof Audio !== "undefined") {
      audioRef.current = new Audio("/alert.mp3");
      audioRef.current.preload = "auto";
    }
  }, []);

  const getDrowsinessScoreFromLevel = (level: string): number => {
    switch (level) {
      case 'Alert':
        return 0;
      case 'Slightly Drowsy':
        return 0.33;
      case 'Moderately Drowsy':
        return 0.66;
      case 'Severely Drowsy':
        return 1.0;
      default:
        return 0;
    }
  };

  const runDrowsinessAnalysis = useCallback(async (currentMetrics: Metrics) => {
    if (!sessionStartTime.current || !isMonitoring) return;
  
    const now = Date.now();
    const windowStartTime = now - ROLLING_WINDOW_SECONDS * 1000;
    
    blinkHistoryRef.current = blinkHistoryRef.current.filter(b => b.time >= windowStartTime);
    yawnHistoryRef.current = yawnHistoryRef.current.filter(y => y.time >= windowStartTime);

    const blinksInWindow = blinkHistoryRef.current.length;
    const yawnsInWindow = yawnHistoryRef.current.length;

    const elapsedSeconds = (now - windowStartTime) / 1000;
    const blinkRate = (blinksInWindow / elapsedSeconds) * 60;
    const yawnRate = (yawnsInWindow / elapsedSeconds) * 60;

    const normalizedEar = calibrationData.baselineEar ? currentMetrics.ear / calibrationData.baselineEar : currentMetrics.ear;
  
    const input: DrowsinessAnalysisInput = {
      blinkRate: isNaN(blinkRate) ? 0 : parseFloat(blinkRate.toFixed(2)),
      yawnRate: isNaN(yawnRate) ? 0 : parseFloat(yawnRate.toFixed(2)),
      eyeAspectRatio: parseFloat(normalizedEar.toFixed(3)),
      mouthAspectRatio: currentMetrics.mar,
      confoundingCircumstances: "None",
    };
  
    try {
      const result = await drowsinessAnalysis(input);
      setAiAnalysis(result);
      const score = getDrowsinessScoreFromLevel(result.drowsinessLevel);
      setMetrics(prev => ({...prev, drowsinessScore: score}));
    } catch (error) {
      console.error("AI Analysis failed:", error);
      toast({
        variant: 'destructive',
        title: 'AI Analysis Error',
        description: 'Could not get drowsiness analysis from the AI model.',
      });
    }
  }, [isMonitoring, toast, calibrationData.baselineEar]);

  const handleMetricsUpdate = useCallback((newMetricsData: Partial<Metrics>) => {
    setMetrics(prevMetrics => {
        const updatedMetrics = { ...prevMetrics };
        
        if (newMetricsData.blinkCount) {
            updatedMetrics.blinkCount = prevMetrics.blinkCount + newMetricsData.blinkCount;
            blinkHistoryRef.current.push({ time: Date.now() });
        }
        if (newMetricsData.yawnCount) {
            updatedMetrics.yawnCount = prevMetrics.yawnCount + newMetricsData.yawnCount;
            yawnHistoryRef.current.push({ time: Date.now() });
        }
        if (newMetricsData.ear !== undefined) {
          updatedMetrics.ear = newMetricsData.ear;
        }
        if (newMetricsData.mar !== undefined) {
          updatedMetrics.mar = newMetricsData.mar;
        }

        if (analysisTimeout.current) clearTimeout(analysisTimeout.current);
        analysisTimeout.current = setTimeout(() => runDrowsinessAnalysis(updatedMetrics), 1500);

        return updatedMetrics;
    });
  }, [runDrowsinessAnalysis]);

  useEffect(() => {
    if (!isMonitoring) return;

    const historyInterval = setInterval(() => {
      setDrowsinessHistory(prevHistory => {
          const now = new Date();
          const newPoint: DrowsinessDataPoint = {
            time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit'}),
            drowsiness: metrics.drowsinessScore,
            blinks: metrics.blinkCount,
            yawns: metrics.yawnCount,
          };
          const newHistory = [...prevHistory, newPoint];
          return newHistory.length > 60 ? newHistory.slice(1) : newHistory;
      });
    }, 2000);

    return () => clearInterval(historyInterval);
  }, [isMonitoring, metrics.drowsinessScore, metrics.blinkCount, metrics.yawnCount]);

  useEffect(() => {
    const now = Date.now();
    if (isMonitoring && aiAnalysis && aiAnalysis.drowsinessLevel !== 'Alert' && (now - lastAlertTime.current > 30000)) { // 30s cooldown
      setShowAlert(true);
      if (settings.audibleAlerts && audioRef.current) {
        audioRef.current.play().catch(e => console.error("Error playing sound:", e));
      }
      lastAlertTime.current = now;
    }
  }, [isMonitoring, aiAnalysis, settings.drowsinessThreshold, settings.audibleAlerts]);

  const resetState = () => {
    setMetrics({ blinkCount: 0, blinkDuration: 0, yawnCount: 0, yawnDuration: 0, ear: 0, mar: 0, drowsinessScore: 0 });
    setDrowsinessHistory([]);
    setAiAnalysis(null);
    setShowAlert(false);
    blinkHistoryRef.current = [];
    yawnHistoryRef.current = [];
    lastAlertTime.current = 0;
  };
  
  const handleToggleMonitoring = () => {
    const newIsMonitoring = !isMonitoring;

    if (newIsMonitoring) {
      if (!calibrationData.baselineEar) {
        toast({
          variant: "destructive",
          title: "Calibration Required",
          description: "Please calibrate the system before starting monitoring.",
        });
        setShowCalibration(true);
        return;
      }
      resetState();
      sessionStartTime.current = Date.now();
      setIsMonitoring(true);
    } else {
      if (sessionStartTime.current) {
        const sessionDuration = (Date.now() - sessionStartTime.current) / 1000;
        const avgDrowsiness = drowsinessHistory.reduce((acc, p) => acc + p.drowsiness, 0) / (drowsinessHistory.length || 1);
        setSessionSummaryData({
          duration: sessionDuration,
          totalBlinks: metrics.blinkCount,
          totalYawns: metrics.yawnCount,
          avgDrowsiness: avgDrowsiness,
          alerts: drowsinessHistory.filter(p => p.drowsiness > settings.drowsinessThreshold).length,
        });
        setShowSummary(true);
      }
      sessionStartTime.current = null;
      setIsMonitoring(false);
    }
  };
  
  const handleExport = () => {
    if (drowsinessHistory.length === 0) {
        toast({ title: 'No Data to Export', description: 'Start a monitoring session to generate data.' });
        return;
    }
    const headers = ["time", "drowsiness_level", "total_blinks", "total_yawns"];
    const rows = drowsinessHistory.map(h => [h.time, h.drowsiness.toFixed(3), h.blinks, h.yawns].join(','));
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    link.setAttribute("download", `vigilance_ai_session_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Export Successful', description: 'Your session data has been downloaded.' });
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
      <Header
        isMonitoring={isMonitoring}
        onToggleMonitoring={handleToggleMonitoring}
        onCalibrate={() => setShowCalibration(true)}
        onOpenSettings={() => setShowSettings(true)}
        onExport={handleExport}
        isExportDisabled={drowsinessHistory.length === 0}
      />
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 flex flex-col gap-6">
            {isClient && <WebcamFeed 
                            isActive={isMonitoring || showCalibration} 
                            isMonitoring={isMonitoring}
                            isCalibrating={showCalibration}
                            onMetricsUpdate={handleMetricsUpdate} 
                        />}
            <DrowsinessAnalysis analysis={aiAnalysis} />
          </div>
          <div className="lg:col-span-2 flex flex-col gap-6">
            <MetricsGrid metrics={metrics} />
            <DrowsinessChart data={drowsinessHistory} drowsinessThreshold={settings.drowsinessThreshold} />
          </div>
        </div>
      </main>

      {/* Drowsiness Alert */}
      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2 text-2xl">
              <Siren className="w-8 h-8"/>
              Drowsiness Alert!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-lg">
              {aiAnalysis?.rationale || "High level of drowsiness detected. Please take a break to ensure your safety."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowAlert(false)} className="w-full">Dismiss</AlertDialogAction>
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
        setCalibrationData={setCalibrationData}
      />
      <SessionSummaryDialog
        open={showSummary}
        onOpenChange={setShowSummary}
        summaryData={sessionSummaryData}
        onExport={handleExport}
      />
    </div>
  );
}

    