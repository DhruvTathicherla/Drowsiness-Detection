// ==== rPPG START ====

"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Heart, Activity, Wind, Loader2, CameraOff, AlertCircle, Brain, Droplets, Signal, TrendingUp } from "lucide-react";
import { RPPGProcessor, type RPPGResult } from "@/lib/rppg-processor";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { cn } from "@/lib/utils";

type RPPGStatus = "IDLE" | "INITIALIZING" | "RUNNING" | "ERROR";

interface RPPGPanelProps {
  isActive: boolean;
  title?: string;
  description?: string;
  onResultUpdate?: (result: RPPGResult) => void; // ==== NEW: Callback for result updates ====
}

export default function RPPGPanel({
  isActive,
  title = "Vital Signs (rPPG)",
  description = "Heart rate, pulse rate, and respiratory rate from webcam",
  onResultUpdate
}: RPPGPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<RPPGProcessor | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  
  const [status, setStatus] = useState<RPPGStatus>("IDLE");
  const [rppgResult, setRppgResult] = useState<RPPGResult>({
    heartRate: null,
    pulseRate: null,
    respiratoryRate: null,
    status: 'initializing',
    samplesCollected: 0,
    // ==== NEW FEATURES ====
    stressLevel: null,
    stressIndex: null,
    hrv: null,
    spO2: null,
    signalQuality: 'poor',
    waveformData: [],
  });

  // Initialize processor
  useEffect(() => {
    if (!processorRef.current) {
      processorRef.current = new RPPGProcessor({
        sampleRate: 30,
        minSamplesForAnalysis: 450, // 15 seconds at 30 FPS (better frequency resolution)
        updateInterval: 2.5,
        heartRateBandMin: 1.0, // 60 BPM minimum (more realistic)
        heartRateBandMax: 3.5, // 210 BPM maximum
      });
    }
  }, []);

  // Process video frames
  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const processor = processorRef.current;

    if (!video || !canvas || !processor || video.readyState < 2) {
      return;
    }

    try {
      // Set canvas size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw current frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Try to detect face for ROI initialization (optional, falls back to simple ROI)
      if (faceLandmarkerRef.current && processor) {
        const results = faceLandmarkerRef.current.detectForVideo(video, performance.now());
        if (results.faceLandmarks?.length > 0) {
          const landmarks = results.faceLandmarks[0];
          
          // Calculate face bounding box from landmarks
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          landmarks.forEach((landmark: any) => {
            const x = landmark.x * canvas.width;
            const y = landmark.y * canvas.height;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          });

          const faceWidth = maxX - minX;
          const faceHeight = maxY - minY;
          
          if (faceWidth > 0 && faceHeight > 0) {
            processor.initializeROI(faceWidth, faceHeight, minX, minY);
          }
        }
      }

      // Extract green channel intensity from ROI
      const intensity = processor.extractGreenChannelIntensity(
        imageData,
        canvas.width,
        canvas.height
      );

      if (intensity !== null) {
        // Add sample to processor
        processor.addSample(intensity, performance.now());

        // Process and get results
        const result = processor.process();
        setRppgResult(result);
        
        // ==== NEW: Report result to parent ====
        onResultUpdate?.(result);

        // Log progress with signal quality info
        if (result.samplesCollected % 90 === 0) { // Log every 3 seconds at 30 FPS
          const stats = processor.getSignalStats();
          console.log(`rPPG: collected ${result.samplesCollected} samples`);
          if (stats) {
            console.log(`rPPG: signal stats - mean: ${stats.mean.toFixed(2)}, std: ${stats.std.toFixed(2)}, variance: ${stats.variance.toFixed(4)}`);
          }
          if (result.heartRate !== null) {
            console.log(`rPPG: estimated heart rate = ${result.heartRate} BPM`);
          } else if (result.samplesCollected >= 300) {
            console.log(`rPPG: heart rate calculation failed - check signal quality (variance: ${stats?.variance.toFixed(4) || 'N/A'})`);
          }
          if (result.respiratoryRate !== null) {
            console.log(`rPPG: estimated respiratory rate = ${result.respiratoryRate} breaths/min`);
          }
        }
      }
    } catch (error) {
      console.error("rPPG error: Frame processing failed", error);
    }

    animationFrameId.current = requestAnimationFrame(processFrame);
  }, [onResultUpdate]);

  // Setup webcam and processing
  useEffect(() => {
    async function setupRPPG() {
      if (!isActive) {
        return;
      }

      setStatus("INITIALIZING");

      try {
        // Initialize face landmarker (optional, for better ROI)
        if (!faceLandmarkerRef.current) {
          try {
            const vision = await FilesetResolver.forVisionTasks(
              "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
            );
            faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                delegate: "GPU"
              },
              runningMode: "VIDEO",
              numFaces: 1
            });
          } catch (faceError) {
            console.warn("rPPG: Face detection initialization failed, using simple ROI", faceError);
            // Continue without face detection - will use simple ROI
          }
        }

        // Get webcam stream
        streamRef.current = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setStatus("RUNNING");
            
            // Initialize simple ROI if face detection not available
            if (videoRef.current && processorRef.current) {
              processorRef.current.initializeSimpleROI(
                videoRef.current.videoWidth,
                videoRef.current.videoHeight
              );
            }
            
            animationFrameId.current = requestAnimationFrame(processFrame);
          };
        }
      } catch (error) {
        console.error("rPPG error: Failed to start webcam", error);
        setStatus("ERROR");
      }
    }

    function stopRPPG() {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (processorRef.current) {
        processorRef.current.reset();
      }
      setStatus("IDLE");
      setRppgResult({
        heartRate: null,
        pulseRate: null,
        respiratoryRate: null,
        status: 'initializing',
        samplesCollected: 0,
        // ==== NEW FEATURES ====
        stressLevel: null,
        stressIndex: null,
        hrv: null,
        spO2: null,
        signalQuality: 'poor',
        waveformData: [],
      });
    }

    if (isActive) {
      setupRPPG();
    } else {
      stopRPPG();
    }

    return () => {
      stopRPPG();
    };
  }, [isActive, processFrame]);

  const getStatusDisplay = (): string => {
    switch (rppgResult.status) {
      case 'initializing':
        return 'Initializing...';
      case 'collecting':
        const seconds = Math.floor(rppgResult.samplesCollected / 30);
        return `Collecting data... (${seconds}s / 15s)`;
      case 'running':
        return 'Running';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  // ==== NEW FEATURE HELPERS ====
  const getStressColor = (level: string | null): string => {
    switch (level) {
      case 'low': return 'text-green-500';
      case 'moderate': return 'text-yellow-500';
      case 'high': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getStressBgColor = (level: string | null): string => {
    switch (level) {
      case 'low': return 'bg-green-500/10';
      case 'moderate': return 'bg-yellow-500/10';
      case 'high': return 'bg-red-500/10';
      default: return 'bg-muted/50';
    }
  };

  const getSignalQualityColor = (quality: string): string => {
    switch (quality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'fair': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusColor = (): string => {
    switch (rppgResult.status) {
      case 'initializing':
      case 'collecting':
        return 'text-yellow-500';
      case 'running':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity />
          <span>{title}</span>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Hidden video and canvas for processing */}
        <div className="hidden">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{ transform: 'scaleX(-1)' }}
          />
          <canvas ref={canvasRef} />
        </div>

        {/* Status indicator with Signal Quality */}
        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {status === "INITIALIZING" && <Loader2 className="h-4 w-4 animate-spin" />}
              {status === "ERROR" && <CameraOff className="h-4 w-4" />}
              {status === "RUNNING" && rppgResult.status === 'initializing' && <Loader2 className="h-4 w-4 animate-spin" />}
              {status === "RUNNING" && rppgResult.status === 'collecting' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
              {status === "RUNNING" && rppgResult.status === 'running' && <Activity className="h-4 w-4 text-green-500" />}
              <span className={`text-sm font-medium ${getStatusColor()}`}>
                Status: {status === "ERROR" ? "Unable to access webcam. Please allow camera permission and reload the page." : getStatusDisplay()}
              </span>
            </div>
            {/* Signal Quality Indicator */}
            <div className="flex items-center gap-2">
              <Signal className={cn("h-4 w-4", getSignalQualityColor(rppgResult.signalQuality))} />
              <span className={cn("text-xs font-medium capitalize", getSignalQualityColor(rppgResult.signalQuality))}>
                {rppgResult.signalQuality}
              </span>
            </div>
          </div>
        </div>

        {/* ==== NEW: Real-time Waveform Visualization ==== */}
        {rppgResult.waveformData.length > 0 && (
          <div className="mb-4 p-3 bg-card border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-muted-foreground">PPG Waveform (Live)</span>
            </div>
            <div className="h-16 bg-black/5 rounded relative overflow-hidden">
              <svg 
                className="w-full h-full" 
                viewBox={`0 0 ${rppgResult.waveformData.length} 100`} 
                preserveAspectRatio="none"
              >
                <polyline
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2"
                  points={rppgResult.waveformData.map((val, i) => 
                    `${i},${50 - val * 40}`
                  ).join(' ')}
                />
              </svg>
            </div>
          </div>
        )}

        {/* Primary Metrics display */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Heart Rate */}
          <div className="flex items-center gap-3 p-3 bg-card border rounded-lg">
            <div className="p-2 bg-red-500/10 rounded-full">
              <Heart className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Heart Rate</p>
              <p className="text-xl font-bold">
                {rppgResult.heartRate !== null ? `${rppgResult.heartRate}` : '--'}
                <span className="text-xs font-normal text-muted-foreground ml-1">BPM</span>
              </p>
            </div>
          </div>

          {/* Respiratory Rate */}
          <div className="flex items-center gap-3 p-3 bg-card border rounded-lg">
            <div className="p-2 bg-green-500/10 rounded-full">
              <Wind className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Respiratory</p>
              <p className="text-xl font-bold">
                {rppgResult.respiratoryRate !== null ? `${rppgResult.respiratoryRate}` : '--'}
                <span className="text-xs font-normal text-muted-foreground ml-1">br/min</span>
              </p>
            </div>
          </div>

          {/* ==== NEW: SpO2 Estimation ==== */}
          <div className="flex items-center gap-3 p-3 bg-card border rounded-lg">
            <div className="p-2 bg-cyan-500/10 rounded-full">
              <Droplets className="h-5 w-5 text-cyan-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">SpO2 (Est.)</p>
              <p className="text-xl font-bold">
                {rppgResult.spO2 !== null ? `${rppgResult.spO2}` : '--'}
                <span className="text-xs font-normal text-muted-foreground ml-1">%</span>
              </p>
            </div>
          </div>

          {/* Pulse Rate */}
          <div className="flex items-center gap-3 p-3 bg-card border rounded-lg">
            <div className="p-2 bg-blue-500/10 rounded-full">
              <Activity className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Pulse Rate</p>
              <p className="text-xl font-bold">
                {rppgResult.pulseRate !== null ? `${rppgResult.pulseRate}` : '--'}
                <span className="text-xs font-normal text-muted-foreground ml-1">BPM</span>
              </p>
            </div>
          </div>
        </div>

        {/* ==== NEW: Stress Level Card ==== */}
        <div className={cn(
          "p-4 rounded-lg border mb-4 transition-colors",
          getStressBgColor(rppgResult.stressLevel)
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-full",
                rppgResult.stressLevel === 'low' ? 'bg-green-500/20' :
                rppgResult.stressLevel === 'moderate' ? 'bg-yellow-500/20' :
                rppgResult.stressLevel === 'high' ? 'bg-red-500/20' : 'bg-muted'
              )}>
                <Brain className={cn(
                  "h-5 w-5",
                  getStressColor(rppgResult.stressLevel)
                )} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Stress Level (HRV-based)</p>
                <p className={cn("text-2xl font-bold capitalize", getStressColor(rppgResult.stressLevel))}>
                  {rppgResult.stressLevel || '--'}
                </p>
              </div>
            </div>
            {rppgResult.stressIndex !== null && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Stress Index</p>
                <p className={cn("text-xl font-bold", getStressColor(rppgResult.stressLevel))}>
                  {rppgResult.stressIndex}/100
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ==== NEW: HRV Metrics (Collapsible Details) ==== */}
        {rppgResult.hrv && (
          <div className="p-3 bg-muted/30 rounded-lg border">
            <p className="text-xs font-medium text-muted-foreground mb-2">HRV Metrics (Heart Rate Variability)</p>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-lg font-bold">{rppgResult.hrv.rmssd}</p>
                <p className="text-xs text-muted-foreground">RMSSD</p>
              </div>
              <div>
                <p className="text-lg font-bold">{rppgResult.hrv.sdnn}</p>
                <p className="text-xs text-muted-foreground">SDNN</p>
              </div>
              <div>
                <p className="text-lg font-bold">{rppgResult.hrv.pnn50}%</p>
                <p className="text-xs text-muted-foreground">pNN50</p>
              </div>
              <div>
                <p className="text-lg font-bold">{rppgResult.hrv.meanRR}</p>
                <p className="text-xs text-muted-foreground">Mean RR</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==== rPPG END ====

