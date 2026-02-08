import {z} from 'zod';

// Schema for Drowsiness Analysis
export const DrowsinessAnalysisInputSchema = z.object({
  blinkRate: z.number().describe('The number of blinks per minute.'),
  yawnRate: z.number().describe('The number of yawns per minute.'),
  eyeAspectRatio: z.number().describe('The calculated Eye Aspect Ratio (EAR).'),
  mouthAspectRatio: z.number().describe('The calculated Mouth Aspect Ratio (MAR).'),
  confoundingFactors: z
    .string()
    .optional()
    .describe(
      'Any confounding factors that might affect the interpretation of the metrics (e.g., Had Coffee, Allergies, Feeling Stressed).'
    ),
});
export type DrowsinessAnalysisInput = z.infer<typeof DrowsinessAnalysisInputSchema>;

export const DrowsinessAnalysisOutputSchema = z.object({
  drowsinessLevel: z
    .string()
    .describe(
      'An estimation of the drowsiness level, based on the input metrics and any confounding circumstances. Possible values: Alert, Slightly Drowsy, Moderately Drowsy, Severely Drowsy.'
    ),
  confidence: z
    .number()
    .describe('A confidence score (0-1) indicating the certainty of the drowsiness level estimation.'),
  rationale: z
    .string()
    .describe(
      'Explanation of why the LLM assigned the current drowsiness level, taking into account the inputs, thresholds, and any confounding factors.'
    ),
});
export type DrowsinessAnalysisOutput = z.infer<typeof DrowsinessAnalysisOutputSchema>;


// Schema for Session Summary
export const SummarizeSessionInputSchema = z.object({
    duration: z.number().describe("The total duration of the session in seconds."),
    totalBlinks: z.number().describe("The total number of blinks detected during the session."),
    totalYawns: z.number().describe("The total number of yawns detected during the session."),
    confoundingFactors: z.string().optional().describe("A comma-separated list of any reported confounding factors."),
    drowsinessHistory: z.array(z.object({
        time: z.string(),
        drowsiness: z.number(),
    })).describe("An array of drowsiness scores recorded over time.")
});
export type SummarizeSessionInput = z.infer<typeof SummarizeSessionInputSchema>;

export const SummarizeSessionOutputSchema = z.object({
    headline: z.string().describe("A one-sentence, overall assessment of the session."),
    trends: z.string().describe("1-2 key trends or patterns identified in the session data."),
    insights: z.string().describe("1-2 actionable, personalized insights or recommendations."),
});
export type SummarizeSessionOutput = z.infer<typeof SummarizeSessionOutputSchema>;
