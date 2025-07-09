"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Video, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { calculateEAR, calculateMAR, RIGHT_EYE_LANDMARKS, LEFT_EYE_LANDMARKS, MOUTH_LANDMARKS } from "@/lib/facial-metrics";
import type { Metrics } from "./dashboard";

// --- Detection Constants ---
const EAR_THRESHOLD = 0.23;
const EAR_CONSEC_FRAMES = 3; 
const MAR_THRESHOLD = 0.8; 
const MAR_CONSEC_FRAMES = 25;

type ComponentState = "IDLE" | "INITIALIZING_MODEL" | "INITIALIZING_CAMERA" | "MONITORING" | "ERROR";

export default function WebcamFeed({ isMonitoring, onMetricsUpdate }: { isMonitoring: boolean, onMetricsUpdate: (metrics: Partial<Metrics>) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  
  const [status, setStatus] = useState<ComponentState>("IDLE");
  const [statusMessage, setStatusMessage] = useState("Ready to start monitoring.");

  const { toast } = useToast();

  const eyeState = useRef({ framesClosed: 0, blinkStartTime: 0 });
  const yawnState = useRef({ framesOpen: 0, yawnStartTime: 0 });
  const metricsRef = useRef({ blinkCount: 0, yawnCount: 0, blinkDuration: 0, yawnDuration: 0 });

  // Effect to initialize the FaceLandmarker model, runs only once on mount
  useEffect(() => {
    setStatus("INITIALIZING_MODEL");
    setStatusMessage("Loading AI model...");
    const createFaceLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "CPU"
          },
          runningMode: "VIDEO",
          numFaces: 1
        });
        faceLandmarkerRef.current = landmarker;
        setStatus("IDLE");
        setStatusMessage("Ready to start monitoring.");
      } catch (error) {
        console.error("Failed to load FaceLandmarker model:", error);
        setStatus("ERROR");
        setStatusMessage("Could not load AI model. Please refresh the page.");
        toast({
          variant: "destructive",
          title: "Model Load Error",
          description: "Could not load the AI model for facial analysis.",
        });
      }
    };
    createFaceLandmarker();

    return () => {
      faceLandmarkerRef.current?.close();
    }
  }, [toast]);

  const predictLoop = useCallback(() => {
    const video = videoRef.current;
    const faceLandmarker = faceLandmarkerRef.current;

    if (!video || !faceLandmarker || video.paused || video.ended || video.readyState < 4) {
      if (isMonitoring) {
        animationFrameId.current = requestAnimationFrame(predictLoop);
      }
      return;
    }

    try {
      const results = faceLandmarker.detectForVideo(video, performance.now());
      if (results.faceLandmarks?.length) {
        const landmarks = results.faceLandmarks[0];

        const leftEyeEAR = calculateEAR(LEFT_EYE_LANDMARKS.map(i => landmarks[i]));
        const rightEyeEAR = calculateEAR(RIGHT_EYE_LANDMARKS.map(i => landmarks[i]));
        const avgEAR = (leftEyeEAR + rightEyeEAR) / 2.0;
        const mar = calculateMAR(MOUTH_LANDMARKS.map(i => landmarks[i]));

        // Blink Detection
        if (avgEAR < EAR_THRESHOLD) {
          eyeState.current.framesClosed++;
          if (eyeState.current.framesClosed === 1) eyeState.current.blinkStartTime = performance.now();
        } else {
          if (eyeState.current.framesClosed >= EAR_CONSEC_FRAMES) {
            const blinkDuration = (performance.now() - eyeState.current.blinkStartTime) / 1000;
            metricsRef.current.blinkCount++;
            metricsRef.current.blinkDuration = blinkDuration;
            onMetricsUpdate({ blinkCount: metricsRef.current.blinkCount, blinkDuration: blinkDuration });
          }
          eyeState.current.framesClosed = 0;
        }

        // Yawn Detection
        if (mar > MAR_THRESHOLD) {
          yawnState.current.framesOpen++;
          if (yawnState.current.framesOpen === 1) yawnState.current.yawnStartTime = performance.now();
        } else {
          if (yawnState.current.framesOpen >= MAR_CONSEC_FRAMES) {
            const yawnDuration = (performance.now() - yawnState.current.yawnStartTime) / 1000;
            metricsRef.current.yawnCount++;
            metricsRef.current.yawnDuration = yawnDuration;
            onMetricsUpdate({ yawnCount: metricsRef.current.yawnCount, yawnDuration: yawnDuration });
          }
          yawnState.current.framesOpen = 0;
        }
      }
    } catch (error) {
      console.error("Error during face landmark detection:", error);
    }
    
    if (isMonitoring) {
      animationFrameId.current = requestAnimationFrame(predictLoop);
    }
  }, [onMetricsUpdate, isMonitoring]);

  // This effect manages the state transitions based on the `isMonitoring` prop.
  useEffect(() => {
    if (isMonitoring) {
      if (status === 'IDLE' && faceLandmarkerRef.current) {
        setStatus('INITIALIZING_CAMERA');
      }
    } else {
      // Stop monitoring logic
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      if (status !== 'ERROR' && status !== 'INITIALIZING_MODEL') {
        setStatus("IDLE");
        setStatusMessage("Ready to start monitoring.");
      }
    }
  }, [isMonitoring, status]);

  // This effect handles the side-effects for the INITIALIZING_CAMERA state.
  useEffect(() => {
    if (status === 'INITIALIZING_CAMERA') {
      setStatusMessage("Initializing camera...");
      
      const initializeCamera = async () => {
        metricsRef.current = { blinkCount: 0, yawnCount: 0, blinkDuration: 0, yawnDuration: 0 };
        eyeState.current = { framesClosed: 0, blinkStartTime: 0 };
        yawnState.current = { framesOpen: 0, yawnStartTime: 0 };
        onMetricsUpdate({ blinkCount: 0, yawnCount: 0, blinkDuration: 0, yawnDuration: 0, drowsiness: 0 });

        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          const video = videoRef.current;
          if (video) {
            video.srcObject = stream;
            video.onloadeddata = () => {
              video.play().then(() => {
                setStatus("MONITORING");
                setStatusMessage("Monitoring active");
                animationFrameId.current = requestAnimationFrame(predictLoop);
              }).catch(playError => {
                console.error("Error playing video:", playError);
                setStatus("ERROR");
                setStatusMessage("Could not start video playback.");
              });
            };
          }
        } catch (error) {
          console.error("Failed to start monitoring:", error);
          setStatus("ERROR");
          if (error instanceof Error && error.name === "NotAllowedError") {
            setStatusMessage("Camera permission denied. Please enable it in your browser settings.");
            toast({
              variant: "destructive",
              title: "Camera Access Denied",
              description: "Please enable camera permissions to use this app.",
            });
          } else {
            setStatusMessage("An error occurred during camera setup.");
            toast({
              variant: "destructive",
              title: "Initialization Error",
              description: "Could not start the monitoring session.",
            });
          }
          setIsMonitoring(false);
        }
      };

      initializeCamera();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, onMetricsUpdate, predictLoop, toast]);

  const showVideo = status === 'MONITORING';
  const showOverlay = status !== 'MONITORING';
  const showLoader = status === 'INITIALIZING_MODEL' || status === 'INITIALIZING_CAMERA';
  
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Video />
          <span>Live Feed</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative aspect-video bg-black rounded-lg flex items-center justify-center border">
          <video 
            ref={videoRef} 
            className="w-full h-full rounded-md object-cover" 
            autoPlay
            muted 
            playsInline 
            style={{ display: 'block', transform: 'scaleX(-1)', opacity: showVideo ? 1 : 0 }}
          />
          {showOverlay && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white rounded-lg p-4 text-center">
              {showLoader && <Loader2 className="h-8 w-8 animate-spin" />}
              <p className="mt-2 text-sm font-medium">{statusMessage}</p>
            </div>
          )}
        </div>
        {status === 'ERROR' && (
            <Alert variant="destructive" className="mt-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                    {statusMessage}
                </AlertDescription>
            </Alert>
        )}
         <p className="mt-2 text-sm text-muted-foreground text-center">Your video is processed locally and never uploaded.</p>
      </CardContent>
    </Card>
  );
}

function setIsMonitoring(arg0: boolean) {
  throw new Error("Function not implemented.");
}
