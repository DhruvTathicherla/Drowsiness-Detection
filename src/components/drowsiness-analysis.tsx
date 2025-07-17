"use client";

import type { DrowsinessAnalysisOutput } from "@/ai/schemas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrainCircuit, Loader2 } from "lucide-react";
import { Separator } from "./ui/separator";

export default function DrowsinessAnalysis({ analysis }: { analysis: DrowsinessAnalysisOutput | null }) {
  const getDrowsinessColor = (level?: string) => {
    switch(level) {
      case 'Slightly Drowsy': return 'text-yellow-400';
      case 'Moderately Drowsy': return 'text-orange-500';
      case 'Severely Drowsy': return 'text-red-600';
      case 'Alert': return 'text-green-500';
      default: return 'text-primary';
    }
  }
  
  return (
    <Card className="shadow-lg min-h-[250px] flex flex-col transition-all duration-300 hover:shadow-xl hover:border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-lg">
          <BrainCircuit className="text-primary w-7 h-7" />
          <span className="font-bold text-xl">AI Drowsiness Analysis</span>
        </CardTitle>
        <CardDescription>
          Live drowsiness assessment powered by AI analysis of your facial metrics.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex items-center justify-center p-4">
        {!analysis ? (
          <div className="text-center text-muted-foreground space-y-3">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <p className="font-medium">Waiting for data to analyze...</p>
            <p className="text-sm">Start a session to begin analysis.</p>
          </div>
        ) : (
          <div className="w-full space-y-4 rounded-lg border bg-background/50 p-4 shadow-inner">
              <h3 className="font-bold text-lg text-center text-primary-foreground/90 tracking-wide">Analysis Result</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
                <div>
                    <p className="text-sm text-muted-foreground font-medium">Drowsiness Level</p>
                    <p className={`font-bold text-3xl tracking-tight ${getDrowsinessColor(analysis.drowsinessLevel)}`}>{analysis.drowsinessLevel}</p>
                </div>
                <div>
                    <p className="text-sm text-muted-foreground font-medium">Confidence</p>
                    <p className="font-bold text-primary text-3xl tracking-tight">{(analysis.confidence * 100).toFixed(0)}%</p>
                </div>
              </div>
              <Separator className="my-3 bg-border/50" />
              <div>
                <p className="text-sm text-muted-foreground font-medium">Rationale</p>
                <p className="mt-1 text-sm leading-relaxed">{analysis.rationale}</p>
              </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
