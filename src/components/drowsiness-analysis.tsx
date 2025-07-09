"use client";

import type { DrowsinessAnalysisOutput } from "@/ai/flows/drowsiness-analysis";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrainCircuit, Loader2 } from "lucide-react";
import { Separator } from "./ui/separator";

export default function DrowsinessAnalysis({ analysis }: { analysis: DrowsinessAnalysisOutput | null }) {
  const getDrowsinessColor = (level?: string) => {
    switch(level) {
      case 'Slightly Drowsy': return 'text-yellow-500';
      case 'Moderately Drowsy': return 'text-orange-500';
      case 'Severely Drowsy': return 'text-red-500';
      case 'Alert': return 'text-green-500';
      default: return 'text-primary';
    }
  }
  
  return (
    <Card className="shadow-lg min-h-[250px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BrainCircuit />
          <span>AI Drowsiness Analysis</span>
        </CardTitle>
        <CardDescription>
          Live drowsiness assessment powered by AI analysis of your facial metrics.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex items-center justify-center">
        {!analysis ? (
          <div className="text-center text-muted-foreground">
            <Loader2 className="mx-auto h-8 w-8 animate-spin" />
            <p className="mt-2">Waiting for data to analyze...</p>
          </div>
        ) : (
          <div className="w-full space-y-4 rounded-lg border bg-card p-4">
              <h3 className="font-semibold text-lg text-center">Analysis Result</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
                <div>
                    <p className="text-sm text-muted-foreground">Drowsiness Level</p>
                    <p className={`font-bold text-2xl ${getDrowsinessColor(analysis.drowsinessLevel)}`}>{analysis.drowsinessLevel}</p>
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">Confidence</p>
                    <p className="font-bold text-primary text-2xl">{(analysis.confidence * 100).toFixed(0)}%</p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Rationale</p>
                <p className="mt-1 text-sm">{analysis.rationale}</p>
              </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
