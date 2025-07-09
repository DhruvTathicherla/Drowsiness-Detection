
"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Video, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FaceLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import { calculateEAR, calculateMAR, RIGHT_EYE_LANDMARKS, LEFT_EYE_LANDMARKS, MOUTH_LANDMARKS } from "@/lib/facial-metrics";
import type { Metrics } from "./dashboard";

// --- Detection Constants ---
const EAR_THRESHOLD = 0.23;
const EAR_CONSEC_FRAMES = 2; 
const MAR_THRESHOLD = 0.7; 
const MAR_CONSEC_FRAMES = 15;

type ComponentState = "IDLE" | "INITIALIZING_MODEL" | "INITIALIZING_CAMERA" | "MONITORING" | "ERROR";

interface WebcamFeedProps {
  isMonitoring: boolean;
  isCalibrating?: boolean;
  onMetricsUpdate: (metrics: Partial<Metrics>) => void;
  onCameraReady?: (ready: boolean) => void;
  showOverlay?: boolean;
}

export default function WebcamFeed({ isMonitoring, isCalibrating = false, onMetricsUpdate, onCameraReady, showOverlay = true }: WebcamFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  
  const [status, setStatus] = useState<ComponentState>("IDLE");
  const [statusMessage, setStatusMessage] = useState("Ready to start monitoring.");

  const { toast } = useToast();

  const eyeState = useRef({ framesClosed: 0, blinkStartTime: 0 });
  const yawnState = useRef({ framesOpen: 0, yawnStartTime: 0 });

  // Initialize the FaceLandmarker model
  useEffect(() => {
    let isCancelled = false;
    const createFaceLandmarker = async () => {
      setStatus("INITIALIZING_MODEL");
      setStatusMessage("Loading AI model...");
      try {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "CPU"
          },
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
          runningMode: "VIDEO",
          numFaces: 1
        });
        if (!isCancelled) {
          faceLandmarkerRef.current = landmarker;
          setStatus("IDLE");
          setStatusMessage("AI model loaded. Ready.");
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Failed to load FaceLandmarker model:", error);
          setStatus("ERROR");
          setStatusMessage("Could not load AI model. Please refresh the page.");
          toast({
            variant: "destructive",
            title: "Model Loading Failed",
            description: "The AI model for face detection could not be loaded. Please check your network or refresh the page."
          });
        }
      }
    };
    createFaceLandmarker();
    return () => {
      isCancelled = true;
      faceLandmarkerRef.current?.close();
    };
  }, [toast]);
  
  const predictLoop = useCallback(() => {
    const video = videoRef.current;
    const faceLandmarker = faceLandmarkerRef.current;
    const canvas = canvasRef.current;
    
    // Condition to continue the loop
    const shouldBeRunning = isMonitoring || isCalibrating;

    if (!video || !faceLandmarker || !canvas || video.paused || video.ended || video.readyState < 2 || !shouldBeRunning) {
      return;
    }
    
    const canvasCtx = canvas.getContext("2d");
    if (!canvasCtx) return;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    try {
      const results = faceLandmarker.detectForVideo(video, performance.now());
      const drawingUtils = new DrawingUtils(canvasCtx);
      
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
        onMetricsUpdate(newMetrics);
      }
    } catch (error) {
      console.error("Error during face landmark detection:", error);
    } finally {
      canvasCtx.restore();
    }
    
    // Continue the loop
    animationFrameId.current = requestAnimationFrame(predictLoop);
  }, [onMetricsUpdate, showOverlay, isMonitoring, isCalibrating]);

  // Effect to manage camera stream and prediction loop
  useEffect(() => {
    let stream: MediaStream | null = null;
    let isCancelled = false;

    const startWebcam = async () => {
        if (!faceLandmarkerRef.current || isCancelled) return;
        
        setStatus('INITIALIZING_CAMERA');
        setStatusMessage("Initializing camera...");

        eyeState.current = { framesClosed: 0, blinkStartTime: 0 };
        yawnState.current = { framesOpen: 0, yawnStartTime: 0 };

        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
            if (isCancelled) {
              stream.getTracks().forEach(track => track.stop());
              return;
            }

            const video = videoRef.current;
            const canvas = canvasRef.current;

            if (video && canvas) {
                video.srcObject = stream;
                video.onloadedmetadata = () => {
                  if (isCancelled) return;
                  video.play();
                  canvas.width = video.videoWidth;
                  canvas.height = video.videoHeight;
                  setStatus("MONITORING");
                  setStatusMessage("Monitoring active");
                  onCameraReady?.(true);
                  // Start the prediction loop
                  if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
                  animationFrameId.current = requestAnimationFrame(predictLoop);
                };
            }
        } catch (error) {
            console.error("Failed to start monitoring:", error);
            if(isCancelled) return;
            setStatus("ERROR");
            onCameraReady?.(false);
            setStatusMessage("Camera permission denied. Please enable it to continue.");
            toast({
              variant: "destructive",
              title: "Camera Access Denied",
              description: "Please enable camera permissions in your browser settings to use this feature."
            });
        }
    };

    const stopWebcam = () => {
      // Stop the prediction loop
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      
      // Stop the camera stream
      const video = videoRef.current;
      if (video && video.srcObject) {
          (video.srcObject as MediaStream).getTracks().forEach(track => track.stop());
          video.srcObject = null;
      }

      // Reset state if not in an error condition
      if (status !== 'ERROR' && status !== 'INITIALIZING_MODEL') {
        setStatus("IDLE");
        setStatusMessage("Ready.");
      }
      onCameraReady?.(false);
    };
    
    const shouldBeRunning = isMonitoring || isCalibrating;
    if (shouldBeRunning) {
        startWebcam();
    }

    // Cleanup function to stop webcam when component unmounts or monitoring stops
    return () => {
        isCancelled = true;
        stopWebcam();
    };
  // This hook should ONLY re-run when isMonitoring or isCalibrating changes.
  }, [isMonitoring, isCalibrating, predictLoop, onCameraReady, toast]);


  const showLoader = status === 'INITIALIZING_MODEL' || status === 'INITIALIZING_CAMERA';
  
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Video />
          <span>Live Feed</span>
        </CardTitle>
        <CardDescription>Your video is processed locally and never uploaded.</CardDescription>
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
          {(status !== 'MONITORING' || !isMonitoring && !isCalibrating) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white rounded-lg p-4 text-center z-10">
              {showLoader && <Loader2 className="h-8 w-8 animate-spin mb-2" />}
              <p className="font-medium">{statusMessage}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
