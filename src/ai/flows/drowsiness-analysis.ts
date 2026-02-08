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
import {apiCircuitBreaker, analyzeApiError, isQuotaExhaustedError} from '@/lib/api-error-handler';


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
    // Check circuit breaker first - if quota is exhausted, skip API call
    if (apiCircuitBreaker.isOpen()) {
      const timeUntilReset = apiCircuitBreaker.getTimeUntilReset();
      const hoursUntilReset = Math.ceil(timeUntilReset / (60 * 60 * 1000));
      
      console.warn('API quota exhausted. Circuit breaker is open. Skipping API call.');
      return {
        drowsinessLevel: 'Alert',
        confidence: 0.3,
        rationale: `API quota has been exhausted. Please check your Google Gemini API plan and billing details. Quota may reset in approximately ${hoursUntilReset} hours. The system is using fallback analysis based on local metrics.`
      };
    }

    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const { output } = await prompt(input);
        // Success - reset circuit breaker if it was previously open
        apiCircuitBreaker.reset();
        return output!;
      } catch (error) {
        const errorInfo = analyzeApiError(error);
        
        // If quota is exhausted, don't retry - immediately return fallback
        if (errorInfo.isQuotaExhausted) {
          apiCircuitBreaker.recordQuotaExhaustion();
          console.error("AI Analysis failed: Quota exhausted. Circuit breaker activated.", error);
          
          const timeUntilReset = apiCircuitBreaker.getTimeUntilReset();
          const hoursUntilReset = Math.ceil(timeUntilReset / (60 * 60 * 1000));
          
          return {
            drowsinessLevel: 'Alert',
            confidence: 0.3,
            rationale: `API quota has been exhausted. Please check your Google Gemini API plan and billing details at https://ai.google.dev/gemini-api/docs/rate-limits. Quota may reset in approximately ${hoursUntilReset} hours. The system is using fallback analysis based on local metrics.`
          };
        }
        
        // For rate limiting, retry with exponential backoff
        if (errorInfo.isRateLimited) {
          attempt++;
          const retryDelay = errorInfo.retryAfter 
            ? errorInfo.retryAfter * 1000 
            : 1000 * Math.pow(2, attempt);
          
          if (attempt >= maxRetries) {
            console.error("AI Analysis failed after multiple retries due to rate limiting:", error);
            return {
              drowsinessLevel: 'Alert',
              confidence: 0.4,
              rationale: 'Rate limit exceeded. Please wait a moment and try again. The system is using fallback analysis based on local metrics.'
            };
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        
        // For other errors, retry with exponential backoff
        attempt++;
        if (attempt >= maxRetries) {
          console.error("AI Analysis failed after multiple retries:", error);
          return {
            drowsinessLevel: 'Alert',
            confidence: 0.5,
            rationale: 'Could not connect to the AI analysis service. Please check your connection and try again. The system is using fallback analysis based on local metrics.'
          };
        }
        
        // Wait for a short period before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }

    // This part should be unreachable but is here for type safety
    throw new Error('AI analysis failed unexpectedly after retries.');
  }
);
