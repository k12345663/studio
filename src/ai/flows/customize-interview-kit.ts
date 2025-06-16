
'use server';

/**
 * @fileOverview This file defines a Genkit flow for customizing an interview kit.
 *
 * It allows recruiters to tweak question wording, re-weight scoring criteria, and regenerate questions.
 * It now also considers candidate experience context, a 5-level difficulty scale, question categories,
 * and specific model answer formatting.
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
  category: z.enum(['Technical', 'Non-Technical']).optional().describe("Category of the question ('Technical' or 'Non-Technical'). Preserve or update if changed by user."),
  text: z.string().describe('The text of the question. Ensure it is insightful and specific.'),
  modelAnswer: z.string().describe("An example answer for the question, presented as 3-4 concise bullet points. Each bullet should be basic, clear, easy to judge, demonstrate proficiency for the target experience level, and reference terms from the Job Description or candidateContext if appropriate. Ensure this format is maintained if modified."),
  difficulty: z.enum(['Naive', 'Beginner', 'Intermediate', 'Expert', 'Master']).optional().describe("The difficulty level of the question (5-point scale: 'Naive', 'Beginner', 'Intermediate', 'Expert', 'Master')."),
  estimatedTimeMinutes: z.number().optional().describe('Suitable estimated time in minutes to answer this question.'),
});

const CompetencySchema = z.object({
  id: z.string().describe('Unique identifier for the competency.'),
  name: z.string().describe('Name of the competency.'),
  importance: z.enum(['High', 'Medium', 'Low']).optional().describe('The importance of this competency for the role.'),
  questions: z.array(QuestionSchema).describe('Array of questions for the competency. Ensure questions and answers maintain high quality if modified or regenerated.'),
});

const RubricCriterionSchema = z.object({
  name: z.string().describe('Name of the criterion, demonstrating contextual understanding and ideally referencing key phrases from the job title/description or candidateContext.'),
  weight: z.number().describe('Weight of the criterion (should sum to 1.0).'),
});

// Define the input schema for the customization flow
const CustomizeInterviewKitInputSchema = z.object({
  jobDescription: z.string().describe('The job description used to generate the interview kit.'),
  candidateExperienceContext: z.string().optional().describe('Optional context about the target candidate’s experience level or background that was used for initial generation and should be considered for refinements.'),
  competencies: z.array(CompetencySchema).describe('Array of core competencies, potentially with importance, questions with category, difficulty/time. User edits are reflected here.'),
  rubricCriteria: z.array(RubricCriterionSchema).describe('Array of rubric criteria with weights. User edits are reflected here.'),
});
export type CustomizeInterviewKitInput = z.infer<typeof CustomizeInterviewKitInputSchema>;

// Define the output schema for the customization flow
const CustomizeInterviewKitOutputSchema = z.object({
  competencies: z.array(CompetencySchema).describe('Array of customized core competencies, including importance, and questions with category, difficulty/time. Quality of questions and answers should be maintained or enhanced, with answers as 3-4 bullet points.'),
  rubricCriteria: z.array(RubricCriterionSchema).describe('Array of customized rubric criteria with weights. Ensure weights sum to 1.0 and criteria reference JD/context.'),
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
  prompt: `You are a senior recruiter. You will be given an interview kit previously generated from a Job Description and potentially Candidate Profile/Context. This kit includes questions, model answers (as 3-4 bullet points), competency importance, question categories ('Technical'/'Non-Technical'), a 5-level question difficulty ('Naive', 'Beginner', 'Intermediate', 'Expert', 'Master'), and estimated times. The recruiter has made edits. Your task is to review these edits and refine the entire kit.

Job Description (for context):
{{{jobDescription}}}

{{#if candidateExperienceContext}}
Candidate Profile / Context (for context):
{{{candidateExperienceContext}}}
{{/if}}

Recruiter's Edited Interview Kit:
Competencies and Questions:
{{#each competencies}}
- Competency Name: "{{name}}" (ID: {{id}})
  {{#if importance}}Importance: {{importance}}{{/if}}
  Questions:
  {{#each questions}}
  - Type: {{type}}, Category: {{category}}, Text: "{{text}}", Model Answer: "{{modelAnswer}}" (ID: {{id}})
    {{#if difficulty}}Difficulty: {{difficulty}}{{/if}}
    {{#if estimatedTimeMinutes}}Estimated Time: {{estimatedTimeMinutes}} min{{/if}}
  {{/each}}
{{/each}}

Rubric Criteria:
{{#each rubricCriteria}}
- Name: "{{name}}", Weight: {{weight}}
{{/each}}

Based on the recruiter's modifications and the original Job Description and Candidate Profile/Context:
1.  Preserve all existing IDs for competencies and questions.
2.  If the recruiter modified a question's text or model answer, ensure the updated content remains high quality, insightful, and relevant. Model answers MUST be 3-4 concise bullet points, clear, easy to judge, and reference JD/context. If a question seems significantly altered, subtly improve it respecting recruiter's intent.
3.  Reflect changes to competency importance, question category ('Technical'/'Non-Technical'), question difficulty (5 levels: 'Naive', 'Beginner', 'Intermediate', 'Expert', 'Master'), or estimated times. Ensure difficulty is one of the 5 allowed levels. If new questions are implicitly added, assign appropriate category, difficulty, estimated time, and ensure well-formed questions with concise 3-4 bullet model answers.
4.  If rubric criteria names or weights were changed, reflect these. Ensure criteria names are contextually relevant, ideally referencing key phrases from the JD or Candidate Profile/Context. Ensure rubric weights for all criteria sum to 1.0. Adjust logically if they do not, prioritizing critical criteria based on JD/context, while staying close to recruiter's weights.
5.  Ensure all output fields (importance, category, difficulty, estimatedTimeMinutes, 3-4 bullet model answers) are present for all competencies and questions.

Return the fully customized and refined interview kit in the specified JSON format. The goal is a polished, consistent, and high-quality interview kit that intelligently incorporates the recruiter's edits and adheres to all formatting requirements.
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
    if (!output) {
      throw new Error("AI failed to customize interview kit content.");
    }
    // Ensure all fields are present even if AI missed them, providing defaults
    const validatedOutput = {
      ...output,
      competencies: output.competencies.map(comp => ({
        ...comp,
        importance: comp.importance || 'Medium',
        questions: comp.questions.map(q => ({
          ...q,
          category: q.category || (q.type === 'Technical' ? 'Technical' : 'Non-Technical'),
          difficulty: q.difficulty || 'Intermediate', 
          estimatedTimeMinutes: q.estimatedTimeMinutes || (q.difficulty === 'Naive' ? 2 : q.difficulty === 'Beginner' ? 4 : q.difficulty === 'Intermediate' ? 6 : q.difficulty === 'Expert' ? 8 : q.difficulty === 'Master' ? 10 : 5),
          text: q.text || "Missing question text",
          modelAnswer: q.modelAnswer || "Missing model answer (should be 3-4 bullet points).",
        })),
      })),
      rubricCriteria: output.rubricCriteria.map(rc => ({
          ...rc,
          name: rc.name || "Unnamed Criterion (should reference JD/context)",
          weight: typeof rc.weight === 'number' ? Math.max(0, Math.min(1, rc.weight)) : 0.2,
      }))
    };

    // Ensure rubric weights sum to 1.0
    const totalWeight = validatedOutput.rubricCriteria.reduce((sum, crit) => sum + crit.weight, 0);
    if (totalWeight > 0 && totalWeight !== 1.0 && validatedOutput.rubricCriteria.length > 0) {
      const factor = 1.0 / totalWeight;
      let sumOfNormalizedWeights = 0;
      validatedOutput.rubricCriteria.forEach((crit, index, arr) => {
        if (index < arr.length -1) {
          crit.weight = parseFloat((crit.weight * factor).toFixed(2));
          sumOfNormalizedWeights += crit.weight;
        } else { 
          crit.weight = parseFloat(Math.max(0, (1.0 - sumOfNormalizedWeights)).toFixed(2));
        }
      });
      let finalSum = validatedOutput.rubricCriteria.reduce((sum, crit) => sum + crit.weight, 0);
      if (finalSum !== 1.0 && validatedOutput.rubricCriteria.length > 0) {
          const diff = 1.0 - finalSum;
          const lastCrit = validatedOutput.rubricCriteria[validatedOutput.rubricCriteria.length-1];
           lastCrit.weight = parseFloat(Math.max(0, lastCrit.weight + diff).toFixed(2));
      }
    } else if (totalWeight === 0 && validatedOutput.rubricCriteria.length > 0) {
        const equalWeight = parseFloat((1.0 / validatedOutput.rubricCriteria.length).toFixed(2));
        let sum = 0;
        validatedOutput.rubricCriteria.forEach((crit, index, arr) => {
            if(index < arr.length -1) {
                crit.weight = equalWeight;
                sum += equalWeight;
            } else {
                crit.weight = parseFloat(Math.max(0,(1.0 - sum)).toFixed(2));
            }
        });
    }
    return validatedOutput;
  }
);
