'use client';

import { useState, useRef, useEffect, type ReactElement } from 'react';
import { analyzeDrowsiness, type AnalyzeDrowsinessOutput } from '@/ai/flows/drowsiness-analysis';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle } from 'lucide-react';

export default function DrowsinessDetector(): ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeDrowsinessOutput | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getCameraPermission = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('Camera not supported on this browser');
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Unsupported Browser',
          description: 'Your browser does not support camera access. Please try a different browser.',
        });
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this feature.',
        });
      }
    };
    getCameraPermission();
  }, [toast]);

  const handleAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || !hasCameraPermission) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);

    const video = video.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const photoDataUri = canvas.toDataURL('image/jpeg');

      try {
        const result = await analyzeDrowsiness({ 
            photoDataUri,
            context: 'User is being monitored for signs of drowsiness while sitting in front of a computer.'
        });
        setAnalysisResult(result);
      } catch (error) {
        console.error('Analysis failed:', error);
        toast({
          variant: 'destructive',
          title: 'Analysis Failed',
          description: 'Something went wrong during the analysis. Please try again.',
        });
      } finally {
        setIsAnalyzing(false);
      }
    } else {
       setIsAnalyzing(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 p-4">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">Vigilance AI</h1>
        <p className="text-lg text-muted-foreground">Your AI-powered drowsiness detection assistant.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Live Camera Feed</CardTitle>
          <CardDescription>Position your face clearly in the frame for analysis.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="relative aspect-video w-full bg-muted rounded-md overflow-hidden border">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                <canvas ref={canvasRef} className="hidden" />
                {hasCameraPermission === null && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}
            </div>

          {hasCameraPermission === false && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Camera Access Required</AlertTitle>
              <AlertDescription>
                Please allow camera access to use this feature. You may need to refresh the page after granting permission.
              </AlertDescription>
            </Alert>
          )}

          <Button onClick={handleAnalyze} disabled={!hasCameraPermission || isAnalyzing} className="w-full text-lg py-6">
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Analyze for Drowsiness'
            )}
          </Button>
        </CardContent>
      </Card>
      
      {isAnalyzing && !analysisResult && (
        <Card className="shadow-lg">
          <CardContent className="p-6 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">AI is analyzing the feed, please wait...</p>
          </CardContent>
        </Card>
      )}

      {analysisResult && (
        <Card className="shadow-lg animate-in fade-in-50">
          <CardHeader>
            <CardTitle>Analysis Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-secondary/50">
              <h3 className="font-semibold text-secondary-foreground">Drowsiness Level</h3>
              <p className="text-2xl font-bold text-primary">{analysisResult.drowsinessLevel}</p>
            </div>
            <div>
              <h3 className="font-semibold">Reasoning</h3>
              <p className="text-muted-foreground">{analysisResult.reason}</p>
            </div>
            <div>
              <h3 className="font-semibold">Recommendation</h3>
              <p className="text-muted-foreground">{analysisResult.recommendation}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
