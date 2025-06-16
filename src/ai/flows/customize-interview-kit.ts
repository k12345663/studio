
'use server';

/**
 * @fileOverview This file defines a Genkit flow for customizing an interview kit.
 *
 * It allows recruiters to tweak question wording, re-weight scoring criteria, and regenerate questions.
 * It now also considers candidate experience context, candidate resume, a 5-level difficulty scale, question categories,
 * and specific model answer formatting.
 * - customizeInterviewKit - A function that handles the interview kit customization process.
 * - CustomizeInterviewKitInput - The input type for the customizeInterviewKit function.
 * - CustomizeInterviewKitOutput - The return type for the customizeInterviewKit function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { QuestionDifficulty } from '@/types/interview-kit'; // For difficultyTimeMap

// This map is used in post-processing if AI doesn't provide estimatedTimeMinutes
const difficultyTimeMap: Record<QuestionDifficulty, number> = {
  Naive: 2,
  Beginner: 4,
  Intermediate: 6,
  Expert: 8,
  Master: 10,
};


// Define schemas for the interview kit components
const QuestionSchema = z.object({
  id: z.string().describe('Unique identifier for the question.'),
  type: z.enum(['Technical', 'Scenario', 'Behavioral']).describe('Type of question.'),
  category: z.enum(['Technical', 'Non-Technical']).optional().describe("Category of the question ('Technical' or 'Non-Technical'). Preserve or update if changed by user."),
  text: z.string().describe('The text of the question. Ensure it is insightful and specific, considering JD and candidate profile.'),
  modelAnswer: z.string().describe("An example answer for the question, presented as 3-4 concise bullet points. Each bullet MUST serve as a general example of a strong answer, be basic, clear, and easy to judge, demonstrate proficiency for the target experience level, and EXPLICITLY reference terms from the Job Description, Candidate Resume, or context if appropriate. Ensure this format is maintained if modified."),
  difficulty: z.enum(['Naive', 'Beginner', 'Intermediate', 'Expert', 'Master']).optional().describe("The difficulty level of the question (5-point scale: 'Naive', 'Beginner', 'Intermediate', 'Expert', 'Master')."),
  estimatedTimeMinutes: z.number().optional().describe('Suitable estimated time in minutes to answer this question.'),
});

const CompetencySchema = z.object({
  id: z.string().describe('Unique identifier for the competency.'),
  name: z.string().describe('Name of the competency.'),
  importance: z.enum(['High', 'Medium', 'Low']).optional().describe('The importance of this competency for the role.'),
  questions: z.array(QuestionSchema).describe('Array of questions for the competency. Ensure questions and answers maintain high quality if modified or regenerated, referencing JD and candidate profile.'),
});

const RubricCriterionSchema = z.object({
  name: z.string().describe('Name of the criterion. Each criterion MUST be actionable, measurable, and explicitly mention key phrases, skills, or concepts from the Job Description AND/OR the Candidate Resume/Context. The set of criteria should provide a broad yet deeply contextual basis for evaluating the candidate comprehensively.'),
  weight: z.number().describe('Weight of the criterion (should sum to 1.0).'),
});

// Define the input schema for the customization flow
const CustomizeInterviewKitInputSchema = z.object({
  jobDescription: z.string().describe('The job description used to generate the interview kit.'),
  candidateExperienceContext: z.string().optional().describe('Optional brief context about the target candidate’s experience that was used and should be considered for refinements (e.g., years of experience, current role, past tech stack).'),
  candidateResume: z.string().optional().describe('The full text of the candidate\'s resume that was used and should be considered for refinements.'),
  competencies: z.array(CompetencySchema).describe('Array of core competencies, potentially with importance, questions with category, difficulty/time. User edits are reflected here.'),
  rubricCriteria: z.array(RubricCriterionSchema).describe('Array of rubric criteria with weights. User edits are reflected here.'),
});
export type CustomizeInterviewKitInput = z.infer<typeof CustomizeInterviewKitInputSchema>;

// Define the output schema for the customization flow
const CustomizeInterviewKitOutputSchema = z.object({
  competencies: z.array(CompetencySchema).describe('Array of customized core competencies, including importance, and questions with category, difficulty/time. Quality of questions and answers should be maintained or enhanced, with answers as 3-4 bullet points referencing JD and candidate profile (serving as general examples of strong answers).'),
  rubricCriteria: z.array(RubricCriterionSchema).describe('Array of customized rubric criteria with weights. Ensure weights sum to 1.0 and criteria reference JD and candidate profile for a broad yet deeply contextual evaluation.'),
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
  prompt: `Critical: Before refining any content, take the time to thoroughly analyze and synthesize ALL provided details about the job, the candidate (from their resume, if provided), any specific experience context, AND the recruiter's edits. Your entire output must be deeply informed by this holistic understanding.

You are a senior recruiter. You will be given an interview kit previously generated from a Job Description, and potentially a Candidate Resume and/or Candidate Experience Context. This kit includes questions, model answers (as 3-4 bullet points referencing JD/resume/context), competency importance, question categories ('Technical'/'Non-Technical'), a 5-level question difficulty ('Naive' to 'Master'), and estimated times. The recruiter has made edits. Your task is to review these edits and refine the entire kit, ensuring it remains highly contextual to all provided inputs. You MUST thoroughly analyze all inputs: the original Job Description, Candidate Resume (if available), Candidate Experience Context, AND the recruiter's edits.

Job Description (for context):
{{{jobDescription}}}

{{#if candidateResume}}
Candidate Resume (for context):
{{{candidateResume}}}
{{/if}}

{{#if candidateExperienceContext}}
Candidate Experience Context (additional notes on candidate's background, e.g., years of experience, current role, past tech stack, for context):
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

Based on the recruiter's modifications and a holistic understanding of the original Job Description, Candidate Resume, and Candidate Experience Context:
1.  Preserve all existing IDs for competencies and questions.
2.  If the recruiter modified a question's text or model answer, ensure the updated content remains high quality, insightful, and relevant to the JD and candidate profile (resume/context). Model answers MUST be 3-4 concise bullet points, serving as general examples of strong answers, be basic, clear, and easy to judge, and EXPLICITLY reference specific terms, skills, or experiences from the Job Description AND/OR Candidate Resume/Context. If a question seems significantly altered, subtly improve it respecting recruiter's intent, maintaining contextual links, and ensuring the 3-4 bullet point format for answers.
3.  Reflect changes to competency importance, question category ('Technical'/'Non-Technical'), question difficulty (5 levels: 'Naive', 'Beginner', 'Intermediate', 'Expert', 'Master'), or estimated times. Ensure difficulty is one of the 5 allowed levels. If new questions are implicitly added, assign appropriate category, difficulty, estimated time, and ensure well-formed questions with concise 3-4 bullet model answers strongly tied to the JD and candidate profile (resume/context).
4.  If rubric criteria names or weights were changed, reflect these. Ensure criteria names are contextually relevant, EXPLICITLY referencing key phrases from the JD, Candidate Resume, or Candidate Profile/Context to provide a broad yet deeply contextual basis for evaluation. Ensure rubric weights for all criteria sum to 1.0. Adjust logically if they do not, prioritizing critical criteria based on JD/resume/context, while staying close to recruiter's weights.
5.  Ensure all output fields (importance, category, difficulty, estimatedTimeMinutes, 3-4 bullet model answers referencing JD/resume/context, serving as general examples of strong answers) are present for all competencies and questions.

Return the fully customized and refined interview kit in the specified JSON format. The goal is a polished, consistent, and high-quality interview kit that intelligently incorporates the recruiter's edits and adheres to all formatting and contextual requirements based on the JD, resume, and any other candidate context.
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
          estimatedTimeMinutes: q.estimatedTimeMinutes || (difficultyTimeMap[q.difficulty || 'Intermediate']),
          text: q.text || "Missing question text",
          modelAnswer: q.modelAnswer || "Missing model answer (should be 3-4 bullet points referencing JD/resume/context, serving as a general example of a strong answer).",
        })),
      })),
      rubricCriteria: output.rubricCriteria.map(rc => ({
          ...rc,
          name: rc.name || "Unnamed Criterion (should reference JD/resume/context for a broad yet contextual evaluation)",
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
    

    