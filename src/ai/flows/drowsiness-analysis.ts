'use server';
/**
 * @fileOverview Analyzes blink rate, yawn rate, Eye Aspect Ratio (EAR), and Mouth Aspect Ratio (MAR) to estimate drowsiness level.
 *
 * - drowsinessAnalysis - A function that handles the drowsiness analysis process.
 * - DrowsinessAnalysisInput - The input type for the drowsinessAnalysis function.
 * - DrowsinessAnalysisOutput - The return type for the drowsinessAnalysis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {DrowsinessAnalysisInputSchema, DrowsinessAnalysisOutputSchema, type DrowsinessAnalysisInput, type DrowsinessAnalysisOutput} from '@/ai/schemas';


export async function drowsinessAnalysis(input: DrowsinessAnalysisInput): Promise<DrowsinessAnalysisOutput> {
  return drowsinessAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'drowsinessAnalysisPrompt',
  input: {schema: DrowsinessAnalysisInputSchema},
  output: {schema: DrowsinessAnalysisOutputSchema},
  prompt: `You are an expert in analyzing drowsiness levels based on several metrics.

  Given the following metrics, estimate the drowsiness level of the person:

  Blink Rate: {{blinkRate}} blinks/minute
  Yawn Rate: {{yawnRate}} yawns/minute
  Eye Aspect Ratio (EAR): {{eyeAspectRatio}}
  Mouth Aspect Ratio (MAR): {{mouthAspectRatio}}

  Consider these general guidelines, but adapt as necessary:

  - **Alert:** Normal blink rate, low yawn rate, normal EAR and MAR.
  - **Slightly Drowsy:** Slightly reduced blink rate, slightly increased yawn rate, slightly lower EAR and higher MAR.
  - **Moderately Drowsy:** Reduced blink rate, increased yawn rate, lower EAR and higher MAR.
  - **Severely Drowsy:** Significantly reduced blink rate, very high yawn rate, very low EAR and very high MAR.

  Also, take into account any confounding circumstances that could affect the metrics:

  Confounding Circumstances: {{#if confoundingFactors}}{{confoundingFactors}}{{else}}None{{/if}}

  Given all of the above information, estimate the drowsiness level, and provide a confidence score (0-1) for your estimation and a rationale.

  Drowsiness Level: { {{drowsinessLevel}} }
  Confidence: { {{confidence}} }
  Rationale: { {{rationale}} }`,
});

const drowsinessAnalysisFlow = ai.defineFlow(
  {
    name: 'drowsinessAnalysisFlow',
    inputSchema: DrowsinessAnalysisInputSchema,
    outputSchema: DrowsinessAnalysisOutputSchema,
  },
  async (input, streamingCallback) => {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const { output } = await prompt(input);
        return output!;
      } catch (error) {
        attempt++;
        if (attempt >= maxRetries) {
          console.error("AI Analysis failed after multiple retries:", error);
          // Return a default "alert" state or re-throw the error
          // For this use case, we can return a non-drowsy state to avoid false alerts.
          return {
            drowsinessLevel: 'Alert',
            confidence: 0.5,
            rationale: 'Could not connect to the AI analysis service. Please check your connection and try again.'
          };
        }
        // Wait for a short period before retrying (e.g., exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }

    // This part should be unreachable but is here for type safety
    throw new Error('AI analysis failed unexpectedly after retries.');
  }
);
