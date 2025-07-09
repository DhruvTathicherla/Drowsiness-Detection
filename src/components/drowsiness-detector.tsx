'use client';

import { useState, useRef, useEffect, type ReactElement } from 'react';
import { drowsinessAnalysis, type DrowsinessAnalysisOutput } from '@/ai/flows/drowsiness-analysis';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  AlertTriangle,
  FilePenLine,
  Settings,
  Download,
  Play,
  Square,
  Video,
  Eye,
  Clock,
  Smile,
  HeartPulse,
  Wind,
  BrainCircuit
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MetricCard = ({ icon: Icon, title, value, unit, className }: { icon: React.ElementType, title: string, value: string | number, unit: string, className?: string }) => (
    <div className={cn("p-4 rounded-lg bg-secondary", className)}>
        <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-sm font-medium">{title}</span>
            <Icon className="w-5 h-5" />
        </div>
        <p className="text-4xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{unit}</p>
    </div>
);


const Logo = () => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" stroke="hsl(var(--primary))" strokeWidth="2.5"/>
      <circle cx="16" cy="16" r="5" fill="hsl(var(--primary))"/>
    </svg>
);

const DrowsinessLevelMap: { [key: string]: number } = {
    'Alert': 0,
    'Slightly Drowsy': 25,
    'Moderately Drowsy': 50,
    'Very Drowsy': 75,
};

export default function DrowsinessDetector(): ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<DrowsinessAnalysisOutput | null>(null);
  const [metrics, setMetrics] = useState({
      blinkCount: 0,
      blinkDuration: '0.00',
      yawnCount: 0,
      yawnDuration: '0.00',
      heartRate: 75,
      pulseRate: 75,
      respRate: 16,
      drowsiness: 'Low',
  });
  const { toast } = useToast();

  useEffect(() => {
    const getCameraPermission = async () => {
      // Omitted for brevity: same camera permission logic
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCameraPermission(false);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        setHasCameraPermission(false);
      }
    };
    getCameraPermission();
  }, []);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isMonitoring) {
      intervalId = setInterval(async () => {
        if (!videoRef.current || !canvasRef.current || isAnalyzing) return;
        
        setIsAnalyzing(true);
    
          try {
            // Dummy values for now, will be replaced with actual mediapipe logic
            const result = await drowsinessAnalysis({
                blinkRate: 20,
                yawnRate: 2,
                eyeAspectRatio: 0.3,
                mouthAspectRatio: 0.5
            });
            setMetrics(prev => ({...prev, drowsiness: result.drowsinessLevel}));
            setAnalysisResult(result);
          } catch (error) {
            console.error('Analysis failed:', error);
            toast({ variant: 'destructive', title: 'Analysis Failed', description: 'AI analysis could not be completed.' });
          } finally {
            setIsAnalyzing(false);
          }

      }, 5000); // Analyze every 5 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isMonitoring, isAnalyzing, toast]);

  const toggleMonitoring = () => {
      if (!hasCameraPermission) {
           toast({
              variant: 'destructive',
              title: 'Camera Access Required',
              description: 'Please enable camera permissions in your browser settings to start monitoring.',
            });
          return;
      }
      setIsMonitoring(!isMonitoring);
  };

  const drowsinessPercentage = DrowsinessLevelMap[analysisResult?.drowsinessLevel || 'Alert'] ?? 0;

  return (
    <div className="flex flex-col h-full space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
            <Logo />
            <h1 className="text-2xl font-bold text-foreground">Vigilance AI</h1>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline"><FilePenLine className="mr-2 h-4 w-4" /> Calibrate</Button>
            <Button variant="outline"><Settings className="mr-2 h-4 w-4" /> Settings</Button>
            <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export</Button>
            <Button onClick={toggleMonitoring} className="min-w-[120px]">
                {isMonitoring ? <Square className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                {isMonitoring ? 'Stop' : 'Start'}
            </Button>
        </div>
      </header>

      <main className="grid flex-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center gap-2">
              <Video className="w-6 h-6 text-primary"/>
              <CardTitle>Live Feed</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="relative aspect-video w-full bg-black rounded-md overflow-hidden border">
                <video ref={videoRef} className={cn("w-full h-full object-cover", { "hidden": !hasCameraPermission })} autoPlay muted playsInline />
                <canvas ref={canvasRef} className="hidden" />
                {!isMonitoring && hasCameraPermission && (
                     <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-muted-foreground">Ready to start monitoring.</p>
                     </div>
                )}
                {hasCameraPermission === false && (
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                        <Alert variant="destructive" className="w-auto">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Camera Access Required</AlertTitle>
                        <AlertDescription>
                            Please allow camera access to use this feature.
                        </AlertDescription>
                        </Alert>
                    </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Metrics</CardTitle>
              <p className="text-muted-foreground text-sm">Live data from the webcam feed.</p>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard icon={Eye} title="Blink Count" value={metrics.blinkCount} unit="blinks" className="md:col-span-2" />
                <MetricCard icon={Clock} title="Blink Duration" value={metrics.blinkDuration} unit="seconds" className="md:col-span-2" />
                <MetricCard icon={Smile} title="Yawn Count" value={metrics.yawnCount} unit="yawns" className="md:col-span-2" />
                <MetricCard icon={Clock} title="Yawn Duration" value={metrics.yawnDuration} unit="seconds" className="md:col-span-2"/>
                <MetricCard icon={HeartPulse} title="Heart Rate" value={metrics.heartRate} unit="BPM" />
                <MetricCard icon={HeartPulse} title="Pulse Rate" value={isMonitoring ? metrics.pulseRate: 'N/A'} unit="BPM" />
                <MetricCard icon={Wind} title="Resp. Rate" value={isMonitoring ? metrics.respRate : 'N/A'} unit="breaths/min" />
                <div className="p-4 rounded-lg bg-secondary">
                    <div className="flex items-center justify-between text-muted-foreground mb-2">
                        <span className="text-sm font-medium">Drowsiness</span>
                        <BrainCircuit className="w-5 h-5" />
                    </div>
                    <p className="text-4xl font-bold text-foreground">{isMonitoring ? (analysisResult?.drowsinessLevel || 'Analyzing...') : 'Low'}</p>
                    <p className="text-sm text-muted-foreground">{isMonitoring ? `${drowsinessPercentage}%` : "level"}</p>
                </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
