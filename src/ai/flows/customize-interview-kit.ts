'use server';

/**
 * @fileOverview This file defines a Genkit flow for customizing an interview kit.
 *
 * It allows recruiters to tweak question wording, re-weight scoring criteria, and regenerate questions.
 * - customizeInterviewKit - A function that handles the interview kit customization process.
 * - CustomizeInterviewKitInput - The input type for the customizeInterviewKit function.
 * - CustomizeInterviewKitOutput - The return type for the customizeInterviewKit function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define schemas for the interview kit components
const QuestionSchema = z.object({
  id: z.string().describe('Unique identifier for the question.'),
  type: z.enum(['Technical', 'Scenario', 'Behavioral']).describe('Type of question.'),
  text: z.string().describe('The text of the question.'),
  modelAnswer: z.string().describe('An example answer for the question.'),
});

const CompetencySchema = z.object({
  name: z.string().describe('Name of the competency.'),
  questions: z.array(QuestionSchema).describe('Array of questions for the competency.'),
});

const RubricCriterionSchema = z.object({
  name: z.string().describe('Name of the criterion.'),
  weight: z.number().describe('Weight of the criterion (should sum to 1.0).'),
});

// Define the input schema for the customization flow
const CustomizeInterviewKitInputSchema = z.object({
  jobDescription: z.string().describe('The job description used to generate the interview kit.'),
  competencies: z.array(CompetencySchema).describe('Array of core competencies.'),
  rubricCriteria: z.array(RubricCriterionSchema).describe('Array of rubric criteria with weights.'),
});
export type CustomizeInterviewKitInput = z.infer<typeof CustomizeInterviewKitInputSchema>;

// Define the output schema for the customization flow
const CustomizeInterviewKitOutputSchema = z.object({
  competencies: z.array(CompetencySchema).describe('Array of customized core competencies.'),
  rubricCriteria: z.array(RubricCriterionSchema).describe('Array of customized rubric criteria with weights.'),
});
export type CustomizeInterviewKitOutput = z.infer<typeof CustomizeInterviewKitOutputSchema>;

// Exported function to customize the interview kit
export async function customizeInterviewKit(input: CustomizeInterviewKitInput): Promise<CustomizeInterviewKitOutput> {
  return customizeInterviewKitFlow(input);
}

// Define the prompt for customizing the interview kit
const customizeInterviewKitPrompt = ai.definePrompt({
  name: 'customizeInterviewKitPrompt',
  input: {schema: CustomizeInterviewKitInputSchema},
  output: {schema: CustomizeInterviewKitOutputSchema},
  prompt: `You are a senior recruiter. You will be given an interview kit generated from a job description. The recruiter wants you to adjust the interview kit based on the edits they made.

Job Description: {{{jobDescription}}}

Competencies: {{#each competencies}}- Name: {{name}}
  Questions:
  {{#each questions}}  - Type: {{type}}, Text: {{text}}, Model Answer: {{modelAnswer}}{{/each}}{{/each}}

Rubric Criteria: {{#each rubricCriteria}}- Name: {{name}}, Weight: {{weight}}{{/each}}

Return the customized interview kit in the JSON format. Ensure the weights of the rubric criteria sum to 1.0.
`,
});

// Define the Genkit flow for customizing the interview kit
const customizeInterviewKitFlow = ai.defineFlow(
  {
    name: 'customizeInterviewKitFlow',
    inputSchema: CustomizeInterviewKitInputSchema,
    outputSchema: CustomizeInterviewKitOutputSchema,
  },
  async input => {
    const {output} = await customizeInterviewKitPrompt(input);
    return output!;
  }
);
