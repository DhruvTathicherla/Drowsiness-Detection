
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Header from "@/components/header";
import WebcamFeed from "@/components/webcam-feed";
import DrowsinessAnalysis from "@/components/drowsiness-analysis";
import MetricsGrid from "@/components/metrics-grid";
import DrowsinessChart from "@/components/drowsiness-chart";
import SettingsDialog from "@/components/settings-dialog";
import CalibrationDialog from "./calibration-dialog";
import SessionSummaryDialog from "./session-summary-dialog";
import { drowsinessAnalysis, summarizeSession } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import FlashingAlert from "./flashing-alert";
import ConfoundingFactors from "./confounding-factors";
import type { DrowsinessAnalysisOutput, SummarizeSessionOutput } from "@/ai/schemas";

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
  const [sessionSummary, setSessionSummary] = useState<SummarizeSessionOutput | null>(null);
  const [drowsinessHistory, setDrowsinessHistory] = useState<DrowsinessDataPoint[]>([]);
  const [confoundingFactors, setConfoundingFactors] = useState<string[]>([]);
  const [showFlashingAlert, setShowFlashingAlert] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCalibration, setShowCalibration] = useState(true);
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
  const lastAlertTime = useRef<number>(0);
  
  const metricsRef = useRef(metrics);
  const blinkHistoryRef = useRef<EventTimestamp[]>([]);
  const yawnHistoryRef = useRef<EventTimestamp[]>([]);
  const ROLLING_WINDOW_SECONDS = 60;

  useEffect(() => {
    metricsRef.current = metrics;
  }, [metrics]);

  useEffect(() => {
    setIsClient(true);
    // Ensure Audio is only accessed on the client
    if (typeof Audio !== "undefined") {
      audioRef.current = new Audio("/alert.mp3");
      audioRef.current.preload = "auto";
    }
  }, []);

  const getDrowsinessScoreFromLevel = (level: string): number => {
    switch (level) {
      case 'Alert':
        return 0.1; // Return a small non-zero value to show on gauge
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

  const runDrowsinessAnalysis = useCallback(async () => {
    if (!sessionStartTime.current || !isMonitoring) return;
  
    const currentMetrics = metricsRef.current;
    const now = Date.now();
    const windowStartTime = now - ROLLING_WINDOW_SECONDS * 1000;
    
    blinkHistoryRef.current = blinkHistoryRef.current.filter(b => b.time >= windowStartTime);
    yawnHistoryRef.current = yawnHistoryRef.current.filter(y => y.time >= windowStartTime);

    const blinksInWindow = blinkHistoryRef.current.length;
    const yawnsInWindow = yawnHistoryRef.current.length;
  
    const input = {
      blinkRate: blinksInWindow,
      yawnRate: yawnsInWindow,
      eyeAspectRatio: isNaN(currentMetrics.ear) ? 0 : parseFloat(currentMetrics.ear.toFixed(3)),
      mouthAspectRatio: isNaN(currentMetrics.mar) ? 0 : currentMetrics.mar,
      confoundingFactors: confoundingFactors.join(', ') || undefined,
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
  }, [isMonitoring, toast, confoundingFactors]);

  const handleMetricsUpdate = useCallback((newMetricsData: Partial<Metrics>) => {
    setMetrics(prevMetrics => {
        const updatedMetrics = { ...prevMetrics };
        
        if (newMetricsData.blinkCount) {
            updatedMetrics.blinkCount += newMetricsData.blinkCount;
            blinkHistoryRef.current.push({ time: Date.now() });
        }
        if (newMetricsData.yawnCount) {
            updatedMetrics.yawnCount += newMetricsData.yawnCount;
            yawnHistoryRef.current.push({ time: Date.now() });
        }
        if (newMetricsData.ear !== undefined) {
          updatedMetrics.ear = newMetricsData.ear;
        }
        if (newMetricsData.mar !== undefined) {
          updatedMetrics.mar = newMetricsData.mar;
        }
        
        return updatedMetrics;
    });
  }, []);

  useEffect(() => {
    if (!isMonitoring) {
        setShowFlashingAlert(false);
        if(aiAnalysis){
          setAiAnalysis(null);
        }
        return;
    };

    const analysisInterval = setInterval(() => {
      runDrowsinessAnalysis();
    }, 2000);

    const historyInterval = setInterval(() => {
      setDrowsinessHistory(prevHistory => {
          const now = new Date();
          const newPoint: DrowsinessDataPoint = {
            time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit'}),
            drowsiness: metricsRef.current.drowsinessScore,
            blinks: metricsRef.current.blinkCount,
            yawns: metricsRef.current.yawnCount,
          };
          const newHistory = [...prevHistory, newPoint];
          return newHistory.length > 60 ? newHistory.slice(1) : newHistory;
      });
    }, 2000);

    return () => {
        clearInterval(analysisInterval);
        clearInterval(historyInterval);
    }
  }, [isMonitoring, runDrowsinessAnalysis, aiAnalysis]);

  useEffect(() => {
    const now = Date.now();
    const alertLevel = aiAnalysis?.drowsinessLevel;
    const shouldAlert = alertLevel === 'Moderately Drowsy' || alertLevel === 'Severely Drowsy';

    if (isMonitoring && shouldAlert && (now - lastAlertTime.current > 30000)) { // 30s cooldown
      setShowFlashingAlert(true);
      if (settings.audibleAlerts && audioRef.current) {
        audioRef.current.play().catch(e => console.error("Error playing sound:", e));
      }
      lastAlertTime.current = now;
      setTimeout(() => setShowFlashingAlert(false), 5000); // Hide alert after 5 seconds
    }
  }, [isMonitoring, aiAnalysis, settings.audibleAlerts]);

  const resetState = () => {
    setMetrics({ blinkCount: 0, blinkDuration: 0, yawnCount: 0, yawnDuration: 0, ear: 0, mar: 0, drowsinessScore: 0 });
    setDrowsinessHistory([]);
    setAiAnalysis(null);
    setSessionSummary(null);
    setShowFlashingAlert(false);
    blinkHistoryRef.current = [];
    yawnHistoryRef.current = [];
    lastAlertTime.current = 0;
  };
  
  const handleToggleMonitoring = async () => {
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
      setIsMonitoring(false);
      if (sessionStartTime.current) {
        const sessionDuration = (Date.now() - sessionStartTime.current) / 1000;
        const historyForSummary = drowsinessHistory.map(p => ({ time: p.time, drowsiness: p.drowsiness }));

        const summaryInput = {
          duration: sessionDuration,
          totalBlinks: metrics.blinkCount,
          totalYawns: metrics.yawnCount,
          confoundingFactors: confoundingFactors.join(', ') || undefined,
          drowsinessHistory: historyForSummary,
        };

        // For the raw data display in the dialog
        setSessionSummaryData({
          duration: sessionDuration,
          totalBlinks: metrics.blinkCount,
          totalYawns: metrics.yawnCount,
          avgDrowsiness: historyForSummary.length > 0
            ? historyForSummary.reduce((acc, p) => acc + p.drowsiness, 0) / historyForSummary.length
            : 0,
          alerts: drowsinessHistory.filter(p => p.drowsiness >= settings.drowsinessThreshold).length,
        });
        
        setShowSummary(true);

        try {
          const aiSummary = await summarizeSession(summaryInput);
          setSessionSummary(aiSummary);
        } catch(e) {
            console.error("AI Summary failed", e);
            toast({ variant: 'destructive', title: 'AI Summary Failed' });
            setSessionSummary({
                headline: "Could not generate AI summary.",
                trends: "An error occurred while analyzing the session.",
                insights: "Please check your connection and try again."
            })
        }
      }
      sessionStartTime.current = null;
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
      
      <FlashingAlert isAlerting={showFlashingAlert} level={aiAnalysis?.drowsinessLevel} />

      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 flex flex-col gap-6">
            {isClient && <WebcamFeed 
                            isActive={isMonitoring || showCalibration} 
                            onMetricsUpdate={handleMetricsUpdate}
                            isMonitoring={isMonitoring}
                            isCalibrating={showCalibration}
                        />}
            <DrowsinessAnalysis analysis={aiAnalysis} />
          </div>
          <div className="lg:col-span-2 flex flex-col gap-6">
            <MetricsGrid metrics={metrics} />
            <ConfoundingFactors selectedFactors={confoundingFactors} onFactorsChange={setConfoundingFactors} disabled={isMonitoring} />
            <DrowsinessChart data={drowsinessHistory} drowsinessThreshold={settings.drowsinessThreshold} />
          </div>
        </div>
      </main>

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
        liveMetrics={metrics}
      />
      <SessionSummaryDialog
        open={showSummary}
        onOpenChange={(isOpen) => {
            setShowSummary(isOpen);
            if (!isOpen) resetState(); // Reset state when closing the dialog
        }}
        summaryData={sessionSummaryData}
        aiSummary={sessionSummary}
        onExport={handleExport}
      />
    </div>
  );
}
