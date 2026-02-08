
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
// ==== rPPG START ====
import RPPGPanel from "@/components/rppg-panel";
import type { RPPGResult } from "@/lib/rppg-processor";
// ==== rPPG END ====
// ==== FATIGUE ANALYTICS START ====
import FatigueAnalyticsPanel from "@/components/fatigue-analytics-panel";
// ==== FATIGUE ANALYTICS END ====
import { drowsinessAnalysis, summarizeSession } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import FlashingAlert from "./flashing-alert";
import ConfoundingFactors from "./confounding-factors";
import type { DrowsinessAnalysisOutput, SummarizeSessionOutput } from "@/ai/schemas";
import { playAlertSound, startContinuousAlert, stopContinuousAlert } from "@/lib/utils";

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
  const [isContinuousAlerting, setIsContinuousAlerting] = useState(false);
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
  // ==== FATIGUE ANALYTICS STATE ====
  const [rppgResult, setRppgResult] = useState<RPPGResult | null>(null);
  
  const { toast } = useToast();
  const sessionStartTime = useRef<number | null>(null);
  const lastAlertTime = useRef<number>(0);
  
  const metricsRef = useRef(metrics);
  const blinkHistoryRef = useRef<EventTimestamp[]>([]);
  const yawnHistoryRef = useRef<EventTimestamp[]>([]);
  const lastAnalysisTimeRef = useRef<number>(0);
  const quotaExhaustedRef = useRef<boolean>(false);
  const ROLLING_WINDOW_SECONDS = 60;
  const MIN_ANALYSIS_INTERVAL_MS = 15000; // Rate limit: max 1 call per 15 seconds

  useEffect(() => {
    metricsRef.current = metrics;
  }, [metrics]);

  useEffect(() => {
    setIsClient(true);
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
  
    const now = Date.now();
    
    // Rate limiting: Don't call API more than once per MIN_ANALYSIS_INTERVAL_MS
    const timeSinceLastAnalysis = now - lastAnalysisTimeRef.current;
    if (timeSinceLastAnalysis < MIN_ANALYSIS_INTERVAL_MS) {
      return; // Skip this call, wait for next interval
    }
    
    // If quota is exhausted, skip API calls but still update UI with fallback
    if (quotaExhaustedRef.current) {
      // Use local metrics to estimate drowsiness as fallback
      const currentMetrics = metricsRef.current;
      const estimatedScore = Math.min(1, Math.max(0, 
        (1 - currentMetrics.ear) * 0.5 + (currentMetrics.mar > 0.5 ? 0.3 : 0)
      ));
      setMetrics(prev => ({...prev, drowsinessScore: estimatedScore}));
      return;
    }
  
    const currentMetrics = metricsRef.current;
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
      lastAnalysisTimeRef.current = now;
      const result = await drowsinessAnalysis(input);
      
      // Check if the result indicates quota exhaustion
      if (result.rationale?.includes('quota') || result.rationale?.includes('Quota')) {
        quotaExhaustedRef.current = true;
        toast({
          variant: 'destructive',
          title: 'API Quota Exhausted',
          description: 'Google Gemini API quota has been reached. The system is using fallback analysis. Please check your API plan.',
          duration: 10000,
        });
      } else {
        // Reset quota exhausted flag if we get a successful response
        quotaExhaustedRef.current = false;
      }
      
      setAiAnalysis(result);
      const score = getDrowsinessScoreFromLevel(result.drowsinessLevel);
      setMetrics(prev => ({...prev, drowsinessScore: score}));
    } catch (error: unknown) {
      console.error("AI Analysis failed:", error);
      
      // Check if it's a quota error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('quota') || errorMessage.includes('429')) {
        quotaExhaustedRef.current = true;
        toast({
          variant: 'destructive',
          title: 'API Quota Exhausted',
          description: 'Google Gemini API quota has been reached. The system will use fallback analysis. Please check your API plan at https://ai.google.dev/gemini-api/docs/rate-limits',
          duration: 10000,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'AI Analysis Error',
          description: 'Could not get drowsiness analysis from the AI model. Using fallback analysis.',
        });
      }
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
        if(isContinuousAlerting) {
            stopContinuousAlert();
            setIsContinuousAlerting(false);
        }
        if(aiAnalysis){
          setAiAnalysis(null);
        }
        return;
    };

    // Run analysis less frequently to avoid rate limits (every 15 seconds)
    const analysisInterval = setInterval(() => {
      runDrowsinessAnalysis();
    }, MIN_ANALYSIS_INTERVAL_MS);

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
        if (isContinuousAlerting) {
            stopContinuousAlert();
            setIsContinuousAlerting(false);
        }
    }
  }, [isMonitoring, runDrowsinessAnalysis, aiAnalysis, isContinuousAlerting]);

  useEffect(() => {
    const now = Date.now();
    const alertLevel = aiAnalysis?.drowsinessLevel;
    const isSevere = alertLevel === 'Severely Drowsy';
    const isModerate = alertLevel === 'Moderately Drowsy';

    if (isMonitoring && settings.audibleAlerts) {
        if (isSevere && !isContinuousAlerting) {
            startContinuousAlert();
            setIsContinuousAlerting(true);
        } else if (!isSevere && isContinuousAlerting) {
            stopContinuousAlert();
            setIsContinuousAlerting(false);
        } else if (isModerate && !isContinuousAlerting && (now - lastAlertTime.current > 30000)) { // 30s cooldown for moderate
            playAlertSound();
            lastAlertTime.current = now;
        }
    } else if (isContinuousAlerting) { // Stop if monitoring stops or alerts are disabled
        stopContinuousAlert();
        setIsContinuousAlerting(false);
    }
    
    // Visual flashing alert logic
    const shouldFlash = isSevere || isModerate;
    if (isMonitoring && shouldFlash) {
        if (!showFlashingAlert) {
            setShowFlashingAlert(true);
        }
    } else {
        if (showFlashingAlert) {
            setShowFlashingAlert(false);
        }
    }
  }, [isMonitoring, aiAnalysis, settings.audibleAlerts, isContinuousAlerting, showFlashingAlert]);

  const resetState = () => {
    setMetrics({ blinkCount: 0, blinkDuration: 0, yawnCount: 0, yawnDuration: 0, ear: 0, mar: 0, drowsinessScore: 0 });
    setDrowsinessHistory([]);
    setAiAnalysis(null);
    setSessionSummary(null);
    setShowFlashingAlert(false);
    if (isContinuousAlerting) {
        stopContinuousAlert();
        setIsContinuousAlerting(false);
    }
    blinkHistoryRef.current = [];
    yawnHistoryRef.current = [];
    lastAlertTime.current = 0;
    lastAnalysisTimeRef.current = 0;
    quotaExhaustedRef.current = false; // Reset quota flag on new session
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
      if(isContinuousAlerting) {
        stopContinuousAlert();
        setIsContinuousAlerting(false);
      }
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
            {/* ==== rPPG START ==== */}
            {isClient && <RPPGPanel 
                            isActive={isMonitoring || showCalibration}
                            onResultUpdate={setRppgResult}
                        />}
            {/* ==== rPPG END ==== */}
            <DrowsinessAnalysis analysis={aiAnalysis} />
          </div>
          <div className="lg:col-span-2 flex flex-col gap-6">
            <MetricsGrid metrics={metrics} />
            {/* ==== FATIGUE ANALYTICS START ==== */}
            {isClient && <FatigueAnalyticsPanel 
                            isActive={isMonitoring}
                            metrics={metrics}
                            rppgResult={rppgResult}
                        />}
            {/* ==== FATIGUE ANALYTICS END ==== */}
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
