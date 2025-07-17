
"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Video, Loader2, CameraOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FaceLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import { calculateEAR, calculateMAR, LEFT_EYE_LANDMARKS, RIGHT_EYE_LANDMARKS, MOUTH_LANDMARKS } from "@/lib/facial-metrics";
import type { Metrics } from "./dashboard";

const EAR_THRESHOLD = 0.23;
const EAR_CONSEC_FRAMES = 2; 
const MAR_THRESHOLD = 0.7; 
const MAR_CONSEC_FRAMES = 15;

type WebcamStatus = "IDLE" | "INITIALIZING" | "RUNNING" | "ERROR";

interface WebcamFeedProps {
  isActive: boolean;
  onMetricsUpdate: (metrics: Partial<Metrics>) => void;
  showOverlay?: boolean;
  isMonitoring: boolean;
  isCalibrating: boolean;
  title?: string;
  description?: string;
}

export default function WebcamFeed({ 
  isActive, 
  onMetricsUpdate, 
  showOverlay = true,
  isMonitoring,
  isCalibrating,
  title = "Live Feed",
  description = "Your video is processed locally and never uploaded."
}: WebcamFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [status, setStatus] = useState<WebcamStatus>("IDLE");
  
  const { toast } = useToast();

  const eyeState = useRef({ framesClosed: 0, blinkStartTime: 0 });
  const yawnState = useRef({ framesOpen: 0, yawnStartTime: 0 });
  
  const predictLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video && canvas && faceLandmarkerRef.current && video.readyState >= 2) {
      const canvasCtx = canvas.getContext("2d");
      if (!canvasCtx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const results = faceLandmarkerRef.current.detectForVideo(video, performance.now());
      const drawingUtils = new DrawingUtils(canvasCtx);
      
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (results.faceLandmarks?.length) {
        const landmarks = results.faceLandmarks[0];

        if (showOverlay) {
          drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, { color: "#C0C0C070", lineWidth: 1 });
          drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, { color: "#FF3030" });
          drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, { color: "#30FF30" });
          drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LIPS, { color: "#E0E0E0" });
        }
          
        const leftEyeEAR = calculateEAR(LEFT_EYE_LANDMARKS.map(i => landmarks[i]));
        const rightEyeEAR = calculateEAR(RIGHT_EYE_LANDMARKS.map(i => landmarks[i]));
        const avgEAR = (leftEyeEAR + rightEyeEAR) / 2.0;
        const mar = calculateMAR(MOUTH_LANDMARKS.map(i => landmarks[i]));
          
        let newMetrics: Partial<Metrics> = { ear: avgEAR, mar: mar };
  
        if (isMonitoring || isCalibrating) {
            if (isMonitoring) { // Only calculate blinks/yawns if monitoring
                if (avgEAR < EAR_THRESHOLD) {
                    eyeState.current.framesClosed++;
                    if (eyeState.current.framesClosed === 1) eyeState.current.blinkStartTime = performance.now();
                } else {
                    if (eyeState.current.framesClosed >= EAR_CONSEC_FRAMES) {
                        const blinkDuration = (performance.now() - eyeState.current.blinkStartTime) / 1000;
                        newMetrics = {...newMetrics, blinkCount: 1, blinkDuration };
                    }
                    eyeState.current.framesClosed = 0;
                }
                
                if (mar > MAR_THRESHOLD) {
                    yawnState.current.framesOpen++;
                    if (yawnState.current.framesOpen === 1) yawnState.current.yawnStartTime = performance.now();
                } else {
                    if (yawnState.current.framesOpen >= MAR_CONSEC_FRAMES) {
                        const yawnDuration = (performance.now() - yawnState.current.yawnStartTime) / 1000;
                        newMetrics = {...newMetrics, yawnCount: 1, yawnDuration };
                    }
                    yawnState.current.framesOpen = 0;
                }
            }
            onMetricsUpdate(newMetrics);
        }
      }
    }
    
    animationFrameId.current = requestAnimationFrame(predictLoop);
  }, [isMonitoring, isCalibrating, onMetricsUpdate, showOverlay]);
  
  useEffect(() => {
    async function setupWebcam() {
      if (!isActive) {
        return;
      }

      setStatus('INITIALIZING');
      
      try {
        if (!faceLandmarkerRef.current) {
          const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
          faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
              delegate: "GPU"
            },
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
            numFaces: 1
          });
        }

        streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
        
        if (videoRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play();
              setStatus("RUNNING");
              animationFrameId.current = requestAnimationFrame(predictLoop);
            };
        }
      } catch (error) {
        console.error("Failed to start webcam:", error);
        setStatus("ERROR");
        toast({
          variant: "destructive",
          title: "Camera Access Denied",
          description: "Please enable camera permissions in your browser settings."
        });
      }
    }

    function stopWebcam() {
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if(videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setStatus("IDLE");
    }

    if(isActive) {
      setupWebcam();
    } else {
      stopWebcam();
    }

    return () => {
        stopWebcam();
    };
  }, [isActive, predictLoop, toast]);


  const renderOverlay = () => {
    switch (status) {
      case "INITIALIZING":
        return <><Loader2 className="h-8 w-8 animate-spin mb-2" /><p>Initializing camera...</p></>;
      case "ERROR":
        return <><CameraOff className="h-8 w-8 mb-2" /><p>Camera Not Found or Access Denied</p></>;
      case "IDLE":
        return <><Video className="h-8 w-8 mb-2" /><p>Camera is off</p></>;
      default:
        return null;
    }
  }
  
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Video />
          <span>{title}</span>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative aspect-video bg-black rounded-lg flex items-center justify-center border">
          <video 
            ref={videoRef} 
            className="w-full h-full rounded-md object-cover absolute top-0 left-0" 
            autoPlay
            muted 
            playsInline 
            style={{ transform: 'scaleX(-1)' }}
          />
           <canvas ref={canvasRef} className="w-full h-full rounded-md absolute top-0 left-0" style={{ transform: 'scaleX(-1)' }}/>
          {status !== 'RUNNING' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white rounded-lg p-4 text-center z-10">
              {renderOverlay()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
