// ==== FATIGUE ANALYTICS - NEW FEATURE ====

/**
 * Advanced Fatigue Analytics Engine
 * Provides fatigue prediction, micro-sleep detection, cognitive load estimation,
 * risk assessment, and wellness scoring
 */

export interface FatigueAnalyticsResult {
  // Fatigue Prediction
  fatigueScore: number; // 0-100
  fatigueLevel: 'alert' | 'mild' | 'moderate' | 'severe' | 'critical';
  fatigueTrend: 'improving' | 'stable' | 'worsening';
  
  // Micro-Sleep Detection
  microSleepDetected: boolean;
  microSleepCount: number;
  microSleepDuration: number; // Total ms of micro-sleeps
  lastMicroSleepTime: number | null;
  
  // Cognitive Load
  cognitiveLoad: 'low' | 'moderate' | 'high' | 'overload';
  cognitiveLoadScore: number; // 0-100
  
  // Risk Assessment
  riskLevel: 'safe' | 'caution' | 'warning' | 'danger' | 'critical';
  riskScore: number; // 0-100
  riskFactors: string[];
  
  // Wellness Score
  wellnessScore: number; // 0-100
  wellnessStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  
  // Break Recommendation
  breakRecommended: boolean;
  breakUrgency: 'none' | 'suggested' | 'recommended' | 'urgent' | 'immediate';
  timeSinceLastBreak: number; // seconds
  recommendedBreakDuration: number; // minutes
  
  // Session Stats
  sessionDuration: number; // seconds
  alertnessPattern: number[]; // Last 30 data points for trend visualization
}

export interface FatigueInputMetrics {
  ear: number; // Eye Aspect Ratio
  mar: number; // Mouth Aspect Ratio
  blinkCount: number;
  blinkDuration: number;
  yawnCount: number;
  drowsinessScore: number;
  heartRate: number | null;
  respiratoryRate: number | null;
  stressLevel: 'low' | 'moderate' | 'high' | null;
  stressIndex: number | null;
  hrv: { rmssd: number; sdnn: number; } | null;
}

export class FatigueAnalyticsEngine {
  private sessionStartTime: number = Date.now();
  private lastBreakTime: number = Date.now();
  private microSleepHistory: { time: number; duration: number }[] = [];
  private earHistory: number[] = [];
  private alertnessHistory: number[] = [];
  private fatigueHistory: number[] = [];
  private lastEarBelowThreshold: number = 0;
  private eyeClosedStart: number = 0;
  private isEyeClosed: boolean = false;
  
  // Thresholds
  private readonly EAR_CLOSED_THRESHOLD = 0.2;
  private readonly MICRO_SLEEP_MIN_DURATION = 500; // 500ms
  private readonly MICRO_SLEEP_MAX_DURATION = 3000; // 3 seconds
  private readonly BREAK_INTERVAL = 45 * 60 * 1000; // 45 minutes
  
  constructor() {
    this.reset();
  }

  /**
   * Reset the analytics engine
   */
  reset(): void {
    this.sessionStartTime = Date.now();
    this.lastBreakTime = Date.now();
    this.microSleepHistory = [];
    this.earHistory = [];
    this.alertnessHistory = [];
    this.fatigueHistory = [];
    this.lastEarBelowThreshold = 0;
    this.eyeClosedStart = 0;
    this.isEyeClosed = false;
  }

  /**
   * Record a break taken by user
   */
  recordBreak(): void {
    this.lastBreakTime = Date.now();
  }

  /**
   * Main analysis function - call this with current metrics
   */
  analyze(metrics: FatigueInputMetrics): FatigueAnalyticsResult {
    const now = Date.now();
    
    // Update history
    this.earHistory.push(metrics.ear);
    if (this.earHistory.length > 300) this.earHistory.shift(); // Keep 10 seconds at 30fps
    
    // Detect micro-sleep
    this.detectMicroSleep(metrics.ear, now);
    
    // Calculate all scores
    const fatigueScore = this.calculateFatigueScore(metrics);
    const fatigueLevel = this.getFatigueLevel(fatigueScore);
    const fatigueTrend = this.calculateFatigueTrend(fatigueScore);
    
    const cognitiveLoadResult = this.calculateCognitiveLoad(metrics);
    const riskResult = this.calculateRiskAssessment(metrics, fatigueScore);
    const wellnessResult = this.calculateWellnessScore(metrics, fatigueScore);
    const breakResult = this.calculateBreakRecommendation(fatigueScore, now);
    
    // Update alertness history for trend visualization
    const alertness = 100 - fatigueScore;
    this.alertnessHistory.push(alertness);
    if (this.alertnessHistory.length > 30) this.alertnessHistory.shift();
    
    // Update fatigue history
    this.fatigueHistory.push(fatigueScore);
    if (this.fatigueHistory.length > 30) this.fatigueHistory.shift();

    return {
      fatigueScore,
      fatigueLevel,
      fatigueTrend,
      
      microSleepDetected: this.microSleepHistory.length > 0 && 
        (now - this.microSleepHistory[this.microSleepHistory.length - 1]?.time < 5000),
      microSleepCount: this.microSleepHistory.length,
      microSleepDuration: this.microSleepHistory.reduce((sum, ms) => sum + ms.duration, 0),
      lastMicroSleepTime: this.microSleepHistory.length > 0 
        ? this.microSleepHistory[this.microSleepHistory.length - 1].time 
        : null,
      
      cognitiveLoad: cognitiveLoadResult.level,
      cognitiveLoadScore: cognitiveLoadResult.score,
      
      riskLevel: riskResult.level,
      riskScore: riskResult.score,
      riskFactors: riskResult.factors,
      
      wellnessScore: wellnessResult.score,
      wellnessStatus: wellnessResult.status,
      
      breakRecommended: breakResult.recommended,
      breakUrgency: breakResult.urgency,
      timeSinceLastBreak: (now - this.lastBreakTime) / 1000,
      recommendedBreakDuration: breakResult.duration,
      
      sessionDuration: (now - this.sessionStartTime) / 1000,
      alertnessPattern: [...this.alertnessHistory],
    };
  }

  /**
   * Detect micro-sleep events (brief eye closures)
   */
  private detectMicroSleep(ear: number, now: number): void {
    if (ear < this.EAR_CLOSED_THRESHOLD) {
      if (!this.isEyeClosed) {
        this.isEyeClosed = true;
        this.eyeClosedStart = now;
      }
    } else {
      if (this.isEyeClosed) {
        const closedDuration = now - this.eyeClosedStart;
        
        // Check if it's a micro-sleep (between 500ms and 3s)
        if (closedDuration >= this.MICRO_SLEEP_MIN_DURATION && 
            closedDuration <= this.MICRO_SLEEP_MAX_DURATION) {
          this.microSleepHistory.push({
            time: now,
            duration: closedDuration
          });
          console.log(`⚠️ Micro-sleep detected: ${closedDuration}ms`);
        }
        
        this.isEyeClosed = false;
      }
    }
    
    // Clean old micro-sleep records (keep last 10 minutes)
    const tenMinutesAgo = now - 10 * 60 * 1000;
    this.microSleepHistory = this.microSleepHistory.filter(ms => ms.time > tenMinutesAgo);
  }

  /**
   * Calculate comprehensive fatigue score (0-100)
   */
  private calculateFatigueScore(metrics: FatigueInputMetrics): number {
    let score = 0;
    
    // Drowsiness component (40% weight)
    score += metrics.drowsinessScore * 40;
    
    // EAR component (20% weight) - lower EAR = more fatigue
    const earScore = metrics.ear > 0 ? Math.max(0, 1 - metrics.ear / 0.3) : 0;
    score += earScore * 20;
    
    // Blink pattern component (15% weight)
    // Excessive blinking or very low blinking indicates fatigue
    const normalBlinkRate = 15; // per minute
    const blinkDeviation = Math.abs(metrics.blinkCount - normalBlinkRate) / normalBlinkRate;
    score += Math.min(1, blinkDeviation) * 15;
    
    // Yawn component (15% weight)
    const yawnScore = Math.min(1, metrics.yawnCount / 5); // 5+ yawns = max score
    score += yawnScore * 15;
    
    // Heart rate variability component (10% weight)
    if (metrics.hrv) {
      // Low HRV indicates fatigue/stress
      const hrvScore = metrics.hrv.rmssd < 20 ? 1 : metrics.hrv.rmssd < 40 ? 0.5 : 0;
      score += hrvScore * 10;
    } else if (metrics.stressIndex !== null) {
      score += (metrics.stressIndex / 100) * 10;
    }
    
    return Math.min(100, Math.max(0, Math.round(score)));
  }

  /**
   * Get fatigue level from score
   */
  private getFatigueLevel(score: number): FatigueAnalyticsResult['fatigueLevel'] {
    if (score < 20) return 'alert';
    if (score < 40) return 'mild';
    if (score < 60) return 'moderate';
    if (score < 80) return 'severe';
    return 'critical';
  }

  /**
   * Calculate fatigue trend
   */
  private calculateFatigueTrend(currentScore: number): FatigueAnalyticsResult['fatigueTrend'] {
    if (this.fatigueHistory.length < 5) return 'stable';
    
    const recentAvg = this.fatigueHistory.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const olderAvg = this.fatigueHistory.slice(0, -5).reduce((a, b) => a + b, 0) / 
                     Math.max(1, this.fatigueHistory.length - 5);
    
    const diff = recentAvg - olderAvg;
    
    if (diff > 5) return 'worsening';
    if (diff < -5) return 'improving';
    return 'stable';
  }

  /**
   * Calculate cognitive load
   */
  private calculateCognitiveLoad(metrics: FatigueInputMetrics): { level: FatigueAnalyticsResult['cognitiveLoad']; score: number } {
    let score = 0;
    
    // Stress contribution (40%)
    if (metrics.stressIndex !== null) {
      score += (metrics.stressIndex / 100) * 40;
    } else if (metrics.stressLevel) {
      const stressMap = { low: 10, moderate: 25, high: 40 };
      score += stressMap[metrics.stressLevel];
    }
    
    // Heart rate contribution (30%) - elevated HR indicates load
    if (metrics.heartRate !== null) {
      const hrDeviation = Math.max(0, (metrics.heartRate - 70) / 50); // Baseline 70 BPM
      score += Math.min(1, hrDeviation) * 30;
    }
    
    // Blink suppression (30%) - cognitive load reduces blink rate
    const blinkSuppression = Math.max(0, 1 - metrics.blinkCount / 20);
    score += blinkSuppression * 30;
    
    score = Math.min(100, Math.max(0, Math.round(score)));
    
    let level: FatigueAnalyticsResult['cognitiveLoad'];
    if (score < 25) level = 'low';
    else if (score < 50) level = 'moderate';
    else if (score < 75) level = 'high';
    else level = 'overload';
    
    return { level, score };
  }

  /**
   * Calculate risk assessment
   */
  private calculateRiskAssessment(metrics: FatigueInputMetrics, fatigueScore: number): {
    level: FatigueAnalyticsResult['riskLevel'];
    score: number;
    factors: string[];
  } {
    const factors: string[] = [];
    let score = 0;
    
    // Fatigue contribution (40%)
    score += fatigueScore * 0.4;
    if (fatigueScore > 60) factors.push('High fatigue level');
    
    // Micro-sleep contribution (30%)
    const recentMicroSleeps = this.microSleepHistory.filter(
      ms => Date.now() - ms.time < 5 * 60 * 1000
    ).length;
    if (recentMicroSleeps > 0) {
      score += Math.min(30, recentMicroSleeps * 10);
      factors.push(`${recentMicroSleeps} micro-sleep(s) in last 5 min`);
    }
    
    // Eye closure (20%)
    if (metrics.ear < 0.2) {
      score += 20;
      factors.push('Eyes closing');
    } else if (metrics.ear < 0.25) {
      score += 10;
      factors.push('Droopy eyelids');
    }
    
    // Session duration (10%)
    const sessionMinutes = (Date.now() - this.sessionStartTime) / 60000;
    if (sessionMinutes > 120) {
      score += 10;
      factors.push('Extended session (>2 hours)');
    } else if (sessionMinutes > 60) {
      score += 5;
      factors.push('Long session (>1 hour)');
    }
    
    score = Math.min(100, Math.max(0, Math.round(score)));
    
    let level: FatigueAnalyticsResult['riskLevel'];
    if (score < 20) level = 'safe';
    else if (score < 40) level = 'caution';
    else if (score < 60) level = 'warning';
    else if (score < 80) level = 'danger';
    else level = 'critical';
    
    return { level, score, factors };
  }

  /**
   * Calculate wellness score
   */
  private calculateWellnessScore(metrics: FatigueInputMetrics, fatigueScore: number): {
    score: number;
    status: FatigueAnalyticsResult['wellnessStatus'];
  } {
    // Wellness is inverse of fatigue + positive indicators
    let score = 100 - fatigueScore;
    
    // Adjust based on stress (negative impact)
    if (metrics.stressLevel === 'high') score -= 15;
    else if (metrics.stressLevel === 'moderate') score -= 5;
    else if (metrics.stressLevel === 'low') score += 5;
    
    // Adjust based on heart rate (optimal range bonus)
    if (metrics.heartRate !== null) {
      if (metrics.heartRate >= 60 && metrics.heartRate <= 80) {
        score += 5; // Optimal resting HR
      } else if (metrics.heartRate > 100) {
        score -= 10; // Elevated HR
      }
    }
    
    // Adjust based on HRV (higher is better)
    if (metrics.hrv && metrics.hrv.rmssd > 40) {
      score += 5; // Good HRV
    }
    
    score = Math.min(100, Math.max(0, Math.round(score)));
    
    let status: FatigueAnalyticsResult['wellnessStatus'];
    if (score >= 80) status = 'excellent';
    else if (score >= 60) status = 'good';
    else if (score >= 40) status = 'fair';
    else if (score >= 20) status = 'poor';
    else status = 'critical';
    
    return { score, status };
  }

  /**
   * Calculate break recommendation
   */
  private calculateBreakRecommendation(fatigueScore: number, now: number): {
    recommended: boolean;
    urgency: FatigueAnalyticsResult['breakUrgency'];
    duration: number;
  } {
    const timeSinceBreak = now - this.lastBreakTime;
    const recentMicroSleeps = this.microSleepHistory.filter(
      ms => now - ms.time < 5 * 60 * 1000
    ).length;
    
    let urgency: FatigueAnalyticsResult['breakUrgency'] = 'none';
    let duration = 0;
    
    // Critical: Micro-sleeps detected
    if (recentMicroSleeps >= 2) {
      urgency = 'immediate';
      duration = 15;
    }
    // Danger: High fatigue + micro-sleep
    else if (fatigueScore > 70 || recentMicroSleeps >= 1) {
      urgency = 'urgent';
      duration = 10;
    }
    // Warning: Moderate fatigue or long session
    else if (fatigueScore > 50 || timeSinceBreak > this.BREAK_INTERVAL) {
      urgency = 'recommended';
      duration = 5;
    }
    // Suggestion: Mild fatigue approaching break time
    else if (fatigueScore > 30 || timeSinceBreak > this.BREAK_INTERVAL * 0.75) {
      urgency = 'suggested';
      duration = 3;
    }
    
    return {
      recommended: urgency !== 'none',
      urgency,
      duration
    };
  }

  /**
   * Get micro-sleep statistics
   */
  getMicroSleepStats(): { count: number; totalDuration: number; avgDuration: number } {
    const count = this.microSleepHistory.length;
    const totalDuration = this.microSleepHistory.reduce((sum, ms) => sum + ms.duration, 0);
    const avgDuration = count > 0 ? totalDuration / count : 0;
    
    return { count, totalDuration, avgDuration };
  }
}

// ==== END FATIGUE ANALYTICS ====

