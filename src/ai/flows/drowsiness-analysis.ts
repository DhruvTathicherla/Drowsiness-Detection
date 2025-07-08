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
  photoDataUri: z
    .string()
    .describe(
      "A photo of a person's face, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  context: z.string().optional().describe('Any contextual information that might affect drowsiness (e.g., driving, reading, etc.).'),
});
export type AnalyzeDrowsinessInput = z.infer<typeof AnalyzeDrowsinessInputSchema>;

const AnalyzeDrowsinessOutputSchema = z.object({
  drowsinessLevel: z.string().describe('A qualitative assessment of drowsiness level (e.g., Alert, Slightly Drowsy, Moderately Drowsy, Very Drowsy).'),
  reason: z.string().describe("Explanation for the assessed drowsiness level, analyzing the person's face for signs of drowsiness like eye closure, yawning, etc."),
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
  prompt: `You are an expert in analyzing drowsiness levels based on a photo of a person's face.

  Analyze the provided photo to assess the person's drowsiness level. Look for signs like eye openness (or closure), mouth openness (yawning), head posture, and general facial expression.

  Photo: {{media url=photoDataUri}}
  Context: {{context}}

  Based on your analysis, provide a drowsiness level, a reason for your assessment, and a recommendation.

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
