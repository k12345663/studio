'use server';

/**
 * @fileOverview An interview kit generation AI agent.
 *
 * - generateInterviewKit - A function that handles the interview kit generation process.
 * - GenerateInterviewKitInput - The input type for the generateInterviewKit function.
 * - GenerateInterviewKitOutput - The return type for the generateInterviewKit function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateInterviewKitInputSchema = z.object({
  jobDescription: z
    .string()
    .describe('The job description to generate an interview kit for.'),
});
export type GenerateInterviewKitInput = z.infer<typeof GenerateInterviewKitInputSchema>;

const QuestionAnswerPairSchema = z.object({
  question: z.string().describe('The interview question.'),
  answer: z.string().describe('The model answer for the question.'),
  type: z.enum(['Technical', 'Scenario', 'Behavioral']).describe('The type of question.'),
});

const CompetencySchema = z.object({
  name: z.string().describe('The name of the competency.'),
  questions: z.array(QuestionAnswerPairSchema).describe('The questions for the competency.'),
});

const ScoringCriterionSchema = z.object({
  criterion: z.string().describe('The scoring criterion.'),
  weight: z.number().describe('The weight of the criterion (must sum to 1.0).'),
});

const GenerateInterviewKitOutputSchema = z.object({
  competencies: z.array(CompetencySchema).describe('The core competencies for the job.'),
  scoringRubric: z
    .array(ScoringCriterionSchema)
    .describe('The scoring rubric for the interview.'),
});
export type GenerateInterviewKitOutput = z.infer<typeof GenerateInterviewKitOutputSchema>;

export async function generateInterviewKit(input: GenerateInterviewKitInput): Promise<GenerateInterviewKitOutput> {
  return generateInterviewKitFlow(input);
}

const generateInterviewKitPrompt = ai.definePrompt({
  name: 'generateInterviewKitPrompt',
  input: {schema: GenerateInterviewKitInputSchema},
  output: {schema: GenerateInterviewKitOutputSchema},
  prompt: `You are a senior recruiter. Given a job description:

1. Identify 5-7 core competencies (skills, tools, soft-skills, business outcomes).
2. For each competency create:
   * Technical Q&A
   * Scenario Q&A
   * Behavioral Q&A
3. Provide a rubric with 4-5 weighted criteria (weights sum to 1.0).

Job Description: {{{jobDescription}}}

Return a JSON object that adheres to the following schema:
${GenerateInterviewKitOutputSchema.description}

Ensure that the output is valid JSON and that the weights in the scoring rubric sum to 1.0.`,
});

const generateInterviewKitFlow = ai.defineFlow(
  {
    name: 'generateInterviewKitFlow',
    inputSchema: GenerateInterviewKitInputSchema,
    outputSchema: GenerateInterviewKitOutputSchema,
  },
  async input => {
    const {output} = await generateInterviewKitPrompt(input);
    return output!;
  }
);
