
'use server';
/**
 * @fileOverview Generates a natural language summary of a drowsiness monitoring session.
 *
 * - summarizeSession - A function that handles the session summarization process.
 * - SummarizeSessionInput - The input type for the summarizeSession function.
 * - SummarizeSessionOutput - The return type for the summarizeSession function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {SummarizeSessionInputSchema, SummarizeSessionOutputSchema, type SummarizeSessionInput, type SummarizeSessionOutput} from '@/ai/schemas';

export async function summarizeSession(input: SummarizeSessionInput): Promise<SummarizeSessionOutput> {
  return summarizeSessionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeSessionPrompt',
  input: {schema: SummarizeSessionInputSchema},
  output: {schema: SummarizeSessionOutputSchema},
  prompt: `You are an expert in analyzing driver fatigue and alertness data. Your task is to provide a concise, insightful summary of a user's monitoring session.

  Here is the data for the session:
  - Session Duration: {{duration}} seconds
  - Total Blinks: {{totalBlinks}}
  - Total Yawns: {{totalYawns}}
  - Confounding Factors Reported: {{#if confoundingFactors}}{{confoundingFactors}}{{else}}None{{/if}}
  - Drowsiness History (a series of scores from 0.0 to 1.0 over time): {{#each drowsinessHistory}}{{this.drowsiness}} {{/each}}

  Based on this data, generate a summary. The summary should be broken down into:
  1.  **headline**: A one-sentence, overall assessment of the session (e.g., "You remained mostly alert during this session.", "You showed several signs of moderate drowsiness.").
  2.  **trends**: Identify 1-2 key trends. Look for patterns, like when drowsiness peaked, or if there was a correlation between yawns and higher drowsiness scores. Be specific. (e.g., "Your drowsiness levels were highest in the first half of the session but stabilized later on.", "There was a significant increase in your blink rate after the 15-minute mark, followed by a period of higher drowsiness.").
  3.  **insights**: Provide 1-2 actionable, personalized insights or recommendations based on the data and any confounding factors. (e.g., "Given you had coffee recently, the detected drowsiness might be more significant than it appears. Consider taking a short break.", "The high number of yawns suggests you may benefit from better ventilation or a short walk.").

  Your tone should be helpful, professional, and non-judgmental. Focus on providing clear, useful feedback to the user.`,
});

const summarizeSessionFlow = ai.defineFlow(
  {
    name: 'summarizeSessionFlow',
    inputSchema: SummarizeSessionInputSchema,
    outputSchema: SummarizeSessionOutputSchema,
  },
  async (input) => {
    // If there's very little data, return a default message
    if (input.drowsinessHistory.length < 5) {
      return {
        headline: "Session too short for a detailed analysis.",
        trends: "Not enough data was collected to identify any significant trends.",
        insights: "For a full report, try running a monitoring session for at least a few minutes."
      }
    }
    
    // Format drowsiness history for the prompt
    const processedInput = {
        ...input,
        drowsinessHistory: input.drowsinessHistory.map(h => ({
            ...h,
            drowsiness: parseFloat(h.drowsiness.toFixed(2))
        }))
    };

    const { output } = await prompt(processedInput);
    return output!;
  }
);
