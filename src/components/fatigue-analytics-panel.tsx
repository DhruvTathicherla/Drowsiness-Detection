// ==== FATIGUE ANALYTICS PANEL - NEW FEATURE ====

"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Coffee,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Zap,
  ZapOff,
  Heart,
  Timer,
  Moon,
  Sun,
  Activity,
  BarChart3
} from "lucide-react";
import { FatigueAnalyticsEngine, type FatigueAnalyticsResult, type FatigueInputMetrics } from "@/lib/fatigue-analytics";
import { cn } from "@/lib/utils";
import type { Metrics } from "./dashboard";
import type { RPPGResult } from "@/lib/rppg-processor";

interface FatigueAnalyticsPanelProps {
  isActive: boolean;
  metrics: Metrics;
  rppgResult: RPPGResult | null;
  onBreakTaken?: () => void;
}

export default function FatigueAnalyticsPanel({
  isActive,
  metrics,
  rppgResult,
  onBreakTaken
}: FatigueAnalyticsPanelProps) {
  const engineRef = useRef<FatigueAnalyticsEngine | null>(null);
  const [analytics, setAnalytics] = useState<FatigueAnalyticsResult | null>(null);
  const [showMicroSleepAlert, setShowMicroSleepAlert] = useState(false);

  // Initialize engine
  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new FatigueAnalyticsEngine();
    }
  }, []);

  // Process metrics
  useEffect(() => {
    if (!isActive || !engineRef.current) return;

    const inputMetrics: FatigueInputMetrics = {
      ear: metrics.ear,
      mar: metrics.mar,
      blinkCount: metrics.blinkCount,
      blinkDuration: metrics.blinkDuration,
      yawnCount: metrics.yawnCount,
      drowsinessScore: metrics.drowsinessScore,
      heartRate: rppgResult?.heartRate ?? null,
      respiratoryRate: rppgResult?.respiratoryRate ?? null,
      stressLevel: rppgResult?.stressLevel ?? null,
      stressIndex: rppgResult?.stressIndex ?? null,
      hrv: rppgResult?.hrv ?? null,
    };

    const result = engineRef.current.analyze(inputMetrics);
    setAnalytics(result);

    // Show micro-sleep alert
    if (result.microSleepDetected && !showMicroSleepAlert) {
      setShowMicroSleepAlert(true);
      setTimeout(() => setShowMicroSleepAlert(false), 3000);
    }
  }, [isActive, metrics, rppgResult, showMicroSleepAlert]);

  // Reset when inactive
  useEffect(() => {
    if (!isActive && engineRef.current) {
      engineRef.current.reset();
      setAnalytics(null);
    }
  }, [isActive]);

  const handleBreakTaken = () => {
    if (engineRef.current) {
      engineRef.current.recordBreak();
    }
    onBreakTaken?.();
  };

  // Helper functions for styling
  const getFatigueLevelColor = (level: string | undefined) => {
    switch (level) {
      case 'alert': return 'text-green-500';
      case 'mild': return 'text-blue-500';
      case 'moderate': return 'text-yellow-500';
      case 'severe': return 'text-orange-500';
      case 'critical': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getFatigueBgColor = (level: string | undefined) => {
    switch (level) {
      case 'alert': return 'bg-green-500';
      case 'mild': return 'bg-blue-500';
      case 'moderate': return 'bg-yellow-500';
      case 'severe': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  const getRiskIcon = (level: string | undefined) => {
    switch (level) {
      case 'safe': return <ShieldCheck className="h-5 w-5 text-green-500" />;
      case 'caution': return <Shield className="h-5 w-5 text-blue-500" />;
      case 'warning': return <ShieldAlert className="h-5 w-5 text-yellow-500" />;
      case 'danger': return <ShieldX className="h-5 w-5 text-orange-500" />;
      case 'critical': return <ShieldX className="h-5 w-5 text-red-500" />;
      default: return <Shield className="h-5 w-5" />;
    }
  };

  const getRiskColor = (level: string | undefined) => {
    switch (level) {
      case 'safe': return 'text-green-500';
      case 'caution': return 'text-blue-500';
      case 'warning': return 'text-yellow-500';
      case 'danger': return 'text-orange-500';
      case 'critical': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getBreakUrgencyColor = (urgency: string | undefined) => {
    switch (urgency) {
      case 'immediate': return 'bg-red-500 hover:bg-red-600 animate-pulse';
      case 'urgent': return 'bg-orange-500 hover:bg-orange-600';
      case 'recommended': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'suggested': return 'bg-blue-500 hover:bg-blue-600';
      default: return 'bg-muted';
    }
  };

  const getCognitiveLoadColor = (level: string | undefined) => {
    switch (level) {
      case 'low': return 'text-green-500';
      case 'moderate': return 'text-blue-500';
      case 'high': return 'text-yellow-500';
      case 'overload': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getWellnessColor = (status: string | undefined) => {
    switch (status) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'fair': return 'text-yellow-500';
      case 'poor': return 'text-orange-500';
      case 'critical': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins > 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hours}h ${remainingMins}m`;
    }
    return `${mins}m ${secs}s`;
  };

  if (!analytics) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5" />
            <span>Fatigue Analytics</span>
          </CardTitle>
          <CardDescription>Advanced fatigue prediction and wellness monitoring</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <p>Start monitoring to view analytics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5" />
          <span>Fatigue Analytics</span>
        </CardTitle>
        <CardDescription>Advanced fatigue prediction and wellness monitoring</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Micro-Sleep Alert */}
        {showMicroSleepAlert && (
          <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg animate-pulse">
            <div className="flex items-center gap-2 text-red-500">
              <Moon className="h-5 w-5" />
              <span className="font-bold">⚠️ MICRO-SLEEP DETECTED!</span>
            </div>
            <p className="text-sm text-red-400 mt-1">
              Brief eye closure detected. Consider taking a break immediately.
            </p>
          </div>
        )}

        {/* Main Fatigue Score */}
        <div className="p-4 bg-muted/30 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className={cn("h-5 w-5", getFatigueLevelColor(analytics.fatigueLevel))} />
              <span className="font-medium">Fatigue Score</span>
            </div>
            <div className="flex items-center gap-2">
              {analytics.fatigueTrend === 'improving' && <TrendingDown className="h-4 w-4 text-green-500" />}
              {analytics.fatigueTrend === 'worsening' && <TrendingUp className="h-4 w-4 text-red-500" />}
              {analytics.fatigueTrend === 'stable' && <Minus className="h-4 w-4 text-muted-foreground" />}
              <span className="text-xs text-muted-foreground capitalize">{analytics.fatigueTrend}</span>
            </div>
          </div>
          <div className="flex items-end gap-3">
            <span className={cn("text-4xl font-bold", getFatigueLevelColor(analytics.fatigueLevel))}>
              {analytics.fatigueScore}
            </span>
            <span className={cn("text-lg font-medium capitalize mb-1", getFatigueLevelColor(analytics.fatigueLevel))}>
              {analytics.fatigueLevel}
            </span>
          </div>
          <Progress 
            value={analytics.fatigueScore} 
            className="h-2 mt-2"
          />
        </div>

        {/* Alertness Trend Mini Chart */}
        {analytics.alertnessPattern.length > 5 && (
          <div className="p-3 bg-card border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-muted-foreground">Alertness Trend</span>
            </div>
            <div className="h-12 flex items-end gap-0.5">
              {analytics.alertnessPattern.map((value, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex-1 rounded-t transition-all",
                    value > 70 ? 'bg-green-500' :
                    value > 40 ? 'bg-yellow-500' : 'bg-red-500'
                  )}
                  style={{ height: `${value}%` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* 2x2 Grid of Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          {/* Risk Assessment */}
          <div className="p-3 bg-card border rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              {getRiskIcon(analytics.riskLevel)}
              <span className="text-xs font-medium text-muted-foreground">Risk Level</span>
            </div>
            <p className={cn("text-xl font-bold capitalize", getRiskColor(analytics.riskLevel))}>
              {analytics.riskLevel}
            </p>
            <p className="text-xs text-muted-foreground">{analytics.riskScore}/100</p>
          </div>

          {/* Wellness Score */}
          <div className="p-3 bg-card border rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Heart className={cn("h-4 w-4", getWellnessColor(analytics.wellnessStatus))} />
              <span className="text-xs font-medium text-muted-foreground">Wellness</span>
            </div>
            <p className={cn("text-xl font-bold capitalize", getWellnessColor(analytics.wellnessStatus))}>
              {analytics.wellnessStatus}
            </p>
            <p className="text-xs text-muted-foreground">{analytics.wellnessScore}/100</p>
          </div>

          {/* Cognitive Load */}
          <div className="p-3 bg-card border rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Brain className={cn("h-4 w-4", getCognitiveLoadColor(analytics.cognitiveLoad))} />
              <span className="text-xs font-medium text-muted-foreground">Cognitive Load</span>
            </div>
            <p className={cn("text-xl font-bold capitalize", getCognitiveLoadColor(analytics.cognitiveLoad))}>
              {analytics.cognitiveLoad}
            </p>
            <p className="text-xs text-muted-foreground">{analytics.cognitiveLoadScore}/100</p>
          </div>

          {/* Micro-Sleep Count */}
          <div className="p-3 bg-card border rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Moon className={cn("h-4 w-4", analytics.microSleepCount > 0 ? 'text-red-500' : 'text-green-500')} />
              <span className="text-xs font-medium text-muted-foreground">Micro-Sleeps</span>
            </div>
            <p className={cn("text-xl font-bold", analytics.microSleepCount > 0 ? 'text-red-500' : 'text-green-500')}>
              {analytics.microSleepCount}
            </p>
            <p className="text-xs text-muted-foreground">
              {analytics.microSleepDuration > 0 ? `${(analytics.microSleepDuration / 1000).toFixed(1)}s total` : 'None detected'}
            </p>
          </div>
        </div>

        {/* Session Info */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg text-sm">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Session: {formatTime(analytics.sessionDuration)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Coffee className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Last break: {formatTime(analytics.timeSinceLastBreak)}</span>
          </div>
        </div>

        {/* Risk Factors */}
        {analytics.riskFactors.length > 0 && (
          <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium text-orange-500">Risk Factors</span>
            </div>
            <ul className="text-xs text-orange-400 space-y-1">
              {analytics.riskFactors.map((factor, i) => (
                <li key={i}>• {factor}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Break Recommendation */}
        {analytics.breakRecommended && (
          <div className="space-y-2">
            <Button
              onClick={handleBreakTaken}
              className={cn("w-full", getBreakUrgencyColor(analytics.breakUrgency))}
            >
              <Coffee className="h-4 w-4 mr-2" />
              {analytics.breakUrgency === 'immediate' && '🚨 TAKE A BREAK NOW!'}
              {analytics.breakUrgency === 'urgent' && '⚠️ Break Urgently Needed'}
              {analytics.breakUrgency === 'recommended' && '💡 Break Recommended'}
              {analytics.breakUrgency === 'suggested' && '☕ Consider a Break'}
              <span className="ml-2 text-xs opacity-75">
                ({analytics.recommendedBreakDuration} min)
              </span>
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Click when you take a break to reset timer
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==== END FATIGUE ANALYTICS PANEL ====

