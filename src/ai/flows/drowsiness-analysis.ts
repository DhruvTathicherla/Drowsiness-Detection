'use server';

/**
 * @fileOverview Drowsiness analysis AI agent.
 *
 * - analyzeDrowsiness - A function that handles the drowsiness analysis process.
 * - AnalyzeDrowsinessInput - The input type for the analyzeDrowsiness function.
 * - AnalyzeDrowsinessOutput - The return type for the analyzeDrowsiness function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeDrowsinessInputSchema = z.object({
  ear: z.number().describe('Eye Aspect Ratio (EAR) - a measure of eye openness.'),
  mar: z.number().describe('Mouth Aspect Ratio (MAR) - a measure of mouth openness.'),
  blinkRate: z.number().describe('Number of blinks per minute.'),
  yawnRate: z.number().describe('Number of yawns per minute.'),
  context: z.string().optional().describe('Any contextual information that might affect drowsiness (e.g., driving, reading, etc.).'),
});
export type AnalyzeDrowsinessInput = z.infer<typeof AnalyzeDrowsinessInputSchema>;

const AnalyzeDrowsinessOutputSchema = z.object({
  drowsinessLevel: z.string().describe('A qualitative assessment of drowsiness level (e.g., Alert, Slightly Drowsy, Moderately Drowsy, Very Drowsy).'),
  reason: z.string().describe('Explanation for the assessed drowsiness level, considering EAR, MAR, blink rate, yawn rate, and context.'),
  recommendation: z.string().describe('A recommendation based on the drowsiness level (e.g., Take a break, Adjust environment, etc.).'),
});
export type AnalyzeDrowsinessOutput = z.infer<typeof AnalyzeDrowsinessOutputSchema>;

export async function analyzeDrowsiness(input: AnalyzeDrowsinessInput): Promise<AnalyzeDrowsinessOutput> {
  return analyzeDrowsinessFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeDrowsinessPrompt',
  input: {schema: AnalyzeDrowsinessInputSchema},
  output: {schema: AnalyzeDrowsinessOutputSchema},
  prompt: `You are an expert in analyzing drowsiness levels based on various metrics.

  Given the following information about a person, assess their drowsiness level, provide a reason for your assessment, and offer a recommendation.

  Eye Aspect Ratio (EAR): {{ear}}
  Mouth Aspect Ratio (MAR): {{mar}}
  Blink Rate (blinks/minute): {{blinkRate}}
  Yawn Rate (yawns/minute): {{yawnRate}}
  Context: {{context}}

  Consider potential confounding circumstances (e.g., the person might be talking, reading, etc.) when making your assessment.

  Drowsiness Level (choose one: Alert, Slightly Drowsy, Moderately Drowsy, Very Drowsy):
  Reason:
  Recommendation:
  `,
});

const analyzeDrowsinessFlow = ai.defineFlow(
  {
    name: 'analyzeDrowsinessFlow',
    inputSchema: AnalyzeDrowsinessInputSchema,
    outputSchema: AnalyzeDrowsinessOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
