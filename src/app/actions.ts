'use server';

import { drowsinessAnalysis as drowsinessAnalysisFlow, type DrowsinessAnalysisInput, type DrowsinessAnalysisOutput } from '@/ai/flows/drowsiness-analysis';

export async function drowsinessAnalysis(input: DrowsinessAnalysisInput): Promise<DrowsinessAnalysisOutput> {
  // In a real application, you might add logic here to log the analysis request
  // or save the results to a database like Firebase Firestore.
  const result = await drowsinessAnalysisFlow(input);
  return result;
}
