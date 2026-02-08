'use server';

import { drowsinessAnalysis as drowsinessAnalysisFlow } from '@/ai/flows/drowsiness-analysis';
import { summarizeSession as summarizeSessionFlow } from '@/ai/flows/summarize-session';

import type { DrowsinessAnalysisInput, DrowsinessAnalysisOutput, SummarizeSessionInput, SummarizeSessionOutput } from '@/ai/schemas';

export async function drowsinessAnalysis(input: DrowsinessAnalysisInput): Promise<DrowsinessAnalysisOutput> {
  const result = await drowsinessAnalysisFlow(input);
  return result;
}

export async function summarizeSession(input: SummarizeSessionInput): Promise<SummarizeSessionOutput> {
  const result = await summarizeSessionFlow(input);
  return result;
}
