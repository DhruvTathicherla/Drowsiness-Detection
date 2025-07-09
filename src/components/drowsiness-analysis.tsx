"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { drowsinessAnalysis } from "@/app/actions";
import type { DrowsinessAnalysisOutput } from "@/ai/flows/drowsiness-analysis";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BrainCircuit, Loader2 } from "lucide-react";
import { Separator } from "./ui/separator";

const formSchema = z.object({
  blinkRate: z.coerce.number().min(0, "Blink rate must be positive."),
  yawnRate: z.coerce.number().min(0, "Yawn rate must be positive."),
  eyeAspectRatio: z.coerce.number().min(0).max(1, "EAR must be between 0 and 1."),
  mouthAspectRatio: z.coerce.number().min(0).max(1, "MAR must be between 0 and 1."),
  confoundingCircumstances: z.string().optional(),
});

export default function DrowsinessAnalysis() {
  const [analysisResult, setAnalysisResult] = useState<DrowsinessAnalysisOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      blinkRate: 15,
      yawnRate: 2,
      eyeAspectRatio: 0.3,
      mouthAspectRatio: 0.5,
      confoundingCircumstances: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setAnalysisResult(null);
    try {
      const result = await drowsinessAnalysis(values);
      setAnalysisResult(result);
    } catch (error) {
      console.error("Analysis failed:", error);
      // You could add a toast notification here for the user
    }
    setIsLoading(false);
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BrainCircuit />
          <span>AI Drowsiness Analysis</span>
        </CardTitle>
        <CardDescription>
          Manually input metrics to get an AI-powered drowsiness assessment. This simulates using data from the live feed.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="blinkRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Blink Rate (per min)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 15" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="yawnRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Yawn Rate (per min)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="eyeAspectRatio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Eye Aspect Ratio (EAR)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="e.g., 0.3" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mouthAspectRatio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mouth Aspect Ratio (MAR)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="e.g., 0.5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
                control={form.control}
                name="confoundingCircumstances"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confounding Circumstances</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Allergies, dry eyes, talking" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
          </CardContent>
          <CardFooter className="flex-col items-start gap-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Analyze Drowsiness
            </Button>
            
            {analysisResult && (
              <div className="w-full space-y-4 rounded-lg border bg-secondary/50 p-4">
                  <h3 className="font-semibold text-lg">Analysis Result</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground">Drowsiness Level</p>
                        <p className="font-bold text-primary text-xl">{analysisResult.drowsinessLevel}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Confidence</p>
                        <p className="font-bold text-primary text-xl">{(analysisResult.confidence * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Rationale</p>
                    <p className="mt-1">{analysisResult.rationale}</p>
                  </div>
              </div>
            )}
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
