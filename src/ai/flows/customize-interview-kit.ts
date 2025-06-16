'use server';

/**
 * @fileOverview This file defines a Genkit flow for customizing an interview kit.
 *
 * It allows recruiters to tweak question wording, re-weight scoring criteria, and regenerate questions.
 * It now also considers and allows modification of competency importance, question difficulty, and estimated time.
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
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional().describe('The difficulty level of the question.'),
  estimatedTimeMinutes: z.number().optional().describe('Estimated time in minutes to answer this question.'),
});

const CompetencySchema = z.object({
  id: z.string().describe('Unique identifier for the competency.'),
  name: z.string().describe('Name of the competency.'),
  importance: z.enum(['High', 'Medium', 'Low']).optional().describe('The importance of this competency for the role.'),
  questions: z.array(QuestionSchema).describe('Array of questions for the competency.'),
});

const RubricCriterionSchema = z.object({
  name: z.string().describe('Name of the criterion.'),
  weight: z.number().describe('Weight of the criterion (should sum to 1.0).'),
});

// Define the input schema for the customization flow
const CustomizeInterviewKitInputSchema = z.object({
  jobDescription: z.string().describe('The job description used to generate the interview kit.'),
  competencies: z.array(CompetencySchema).describe('Array of core competencies, potentially with importance, and questions with difficulty/time.'),
  rubricCriteria: z.array(RubricCriterionSchema).describe('Array of rubric criteria with weights.'),
});
export type CustomizeInterviewKitInput = z.infer<typeof CustomizeInterviewKitInputSchema>;

// Define the output schema for the customization flow
const CustomizeInterviewKitOutputSchema = z.object({
  competencies: z.array(CompetencySchema).describe('Array of customized core competencies, including importance, and questions with difficulty/time.'),
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

Original Competencies and Questions (may include importance, difficulty, estimated time):
{{#each competencies}}
- Competency Name: {{name}} (ID: {{id}})
  {{#if importance}}Importance: {{importance}}{{/if}}
  Questions:
  {{#each questions}}
  - Type: {{type}}, Text: {{text}}, Model Answer: {{modelAnswer}} (ID: {{id}})
    {{#if difficulty}}Difficulty: {{difficulty}}{{/if}}
    {{#if estimatedTimeMinutes}}Estimated Time: {{estimatedTimeMinutes}} min{{/if}}
  {{/each}}
{{/each}}

Rubric Criteria:
{{#each rubricCriteria}}
- Name: {{name}}, Weight: {{weight}}
{{/each}}

Review the provided competencies, questions, and rubric. If the recruiter's edits (implicit in the new structure of competencies/questions/rubric sent to you) require changes to importance, difficulty, or estimated time, update them logically. If new questions are generated due to edits, assign appropriate difficulty and estimated time. Ensure existing IDs for competencies and questions are preserved.

Return the fully customized interview kit in the JSON format. Ensure the weights of the rubric criteria sum to 1.0. The output must include importance for competencies and difficulty/estimatedTimeMinutes for questions.
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
    // Ensure all fields are present even if AI missed them, providing defaults
    const validatedOutput = output ? {
      ...output,
      competencies: output.competencies.map(comp => ({
        ...comp,
        importance: comp.importance || 'Medium',
        questions: comp.questions.map(q => ({
          ...q,
          difficulty: q.difficulty || 'Medium',
          estimatedTimeMinutes: q.estimatedTimeMinutes || 5,
        })),
      })),
    } : null;
    return validatedOutput!;
  }
);
