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
  question: z.string().describe('The interview question. Should be insightful and specific to the job description.'),
  answer: z.string().describe('The model answer for the question. Should be comprehensive, articulate, and demonstrate strong proficiency.'),
  type: z.enum(['Technical', 'Scenario', 'Behavioral']).describe('The type of question. Technical for skills/tools, Scenario for problem-solving, Behavioral for past actions (STAR).'),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).describe('The difficulty level of the question.'),
  estimatedTimeMinutes: z.number().describe('Estimated time in minutes a candidate might need for a thorough answer.'),
});

const CompetencySchema = z.object({
  name: z.string().describe('The name of the competency.'),
  importance: z.enum(['High', 'Medium', 'Low']).describe('The importance of this competency for the role.'),
  questions: z.array(QuestionAnswerPairSchema).describe('The questions for the competency. Aim for a mix of Technical, Scenario, and Behavioral questions.'),
});

const ScoringCriterionSchema = z.object({
  criterion: z.string().describe('The scoring criterion. Should be actionable and clearly linked to job requirements.'),
  weight: z.number().describe('The weight of the criterion (must sum to 1.0).'),
});

const GenerateInterviewKitOutputSchema = z.object({
  competencies: z.array(CompetencySchema).describe('The 5-7 core competencies for the job, including their importance and tailored questions.'),
  scoringRubric: z
    .array(ScoringCriterionSchema)
    .describe('The 4-5 weighted scoring rubric criteria for the interview.'),
});
export type GenerateInterviewKitOutput = z.infer<typeof GenerateInterviewKitOutputSchema>;

export async function generateInterviewKit(input: GenerateInterviewKitInput): Promise<GenerateInterviewKitOutput> {
  return generateInterviewKitFlow(input);
}

const generateInterviewKitPrompt = ai.definePrompt({
  name: 'generateInterviewKitPrompt',
  input: {schema: GenerateInterviewKitInputSchema},
  output: {schema: GenerateInterviewKitOutputSchema},
  prompt: `You are a senior hiring manager and expert interviewer. Given a job description:

1. Identify 5-7 core competencies (e.g., specific skills, tools proficiency, soft-skills, relevant business outcomes). For each competency, assess its importance for the role (High, Medium, or Low).
2. For each competency, create 3 distinct, insightful questions:
   * Technical Question: Probes specific technical skills, tools, or platform knowledge directly mentioned or implied in the job description.
   * Scenario-based Question: Presents a realistic work-related challenge or situation relevant to the role. Ask how the candidate would approach it, what factors they'd consider, and their expected outcome.
   * Behavioral Question: Designed to assess past behavior as an indicator of future performance (e.g., "Tell me about a time when...", "Describe a situation where..."). Focus on eliciting specific examples using the STAR (Situation, Task, Action, Result) method.
   For each question:
     - Provide a detailed model answer that an ideal candidate would give. This answer should be comprehensive, articulate, clearly demonstrate the desired skill/behavior, and highlight key positive indicators.
     - Assign a difficulty level (Easy, Medium, Hard).
     - Estimate the time in minutes a candidate might need for a thorough answer (e.g., 5, 10, 15 minutes).
3. Provide a scoring rubric with 4-5 weighted criteria. These criteria should be actionable, measurable, and clearly linked to the most important requirements of the job description. Ensure the weights sum to 1.0.

Job Description: {{{jobDescription}}}

Return a JSON object that adheres to the following schema:
${GenerateInterviewKitOutputSchema.description}

Ensure your questions are not generic and are directly tailored to the specifics of the job description. Model answers must be comprehensive and demonstrate strong proficiency.
All competency, question, and rubric fields defined in the schema (including importance, difficulty, estimatedTimeMinutes, type, etc.) must be populated.`,
});

const generateInterviewKitFlow = ai.defineFlow(
  {
    name: 'generateInterviewKitFlow',
    inputSchema: GenerateInterviewKitInputSchema,
    outputSchema: GenerateInterviewKitOutputSchema,
  },
  async input => {
    const {output} = await generateInterviewKitPrompt(input);
    if (!output) {
      throw new Error("AI failed to generate interview kit content.");
    }
     // Basic validation and default-filling for robustness, though the prompt is strict
    const validatedOutput: GenerateInterviewKitOutput = {
      competencies: (output.competencies || []).map(comp => ({
        name: comp.name || "Unnamed Competency",
        importance: comp.importance || "Medium",
        questions: (comp.questions || []).map(q => ({
          question: q.question || "Missing question text",
          answer: q.answer || "Missing model answer",
          type: q.type || "Behavioral",
          difficulty: q.difficulty || "Medium",
          estimatedTimeMinutes: q.estimatedTimeMinutes || 5,
        })),
      })),
      scoringRubric: (output.scoringRubric || []).map(crit => ({
        criterion: crit.criterion || "Unnamed Criterion",
        weight: typeof crit.weight === 'number' ? Math.max(0, Math.min(1, crit.weight)) : 0.2,
      })),
    };
     // Ensure rubric weights sum to 1.0 if possible, or normalize if not too far off.
    // This is a simple normalization, more complex logic might be needed for perfect sum.
    const totalWeight = validatedOutput.scoringRubric.reduce((sum, crit) => sum + crit.weight, 0);
    if (totalWeight > 0 && totalWeight !== 1.0 && validatedOutput.scoringRubric.length > 0) {
      const factor = 1.0 / totalWeight;
      let sumOfNormalizedWeights = 0;
      validatedOutput.scoringRubric.forEach((crit, index, arr) => {
        if (index < arr.length -1) {
          crit.weight = parseFloat((crit.weight * factor).toFixed(2));
          sumOfNormalizedWeights += crit.weight;
        } else { // Assign remaining to last to hit 1.0 due to potential float precision issues
          crit.weight = parseFloat((1.0 - sumOfNormalizedWeights).toFixed(2));
        }
      });
       // Final check after normalization
      let finalSum = validatedOutput.scoringRubric.reduce((sum, crit) => sum + crit.weight, 0);
      if (finalSum !== 1.0 && validatedOutput.scoringRubric.length > 0) {
          // If still not 1.0, adjust the last element slightly, this is a fallback
          const diff = 1.0 - finalSum;
          validatedOutput.scoringRubric[validatedOutput.scoringRubric.length-1].weight = 
            parseFloat((validatedOutput.scoringRubric[validatedOutput.scoringRubric.length-1].weight + diff).toFixed(2));
      }
    } else if (totalWeight === 0 && validatedOutput.scoringRubric.length > 0) {
        // if all weights are 0, distribute equally
        const equalWeight = parseFloat((1.0 / validatedOutput.scoringRubric.length).toFixed(2));
        let sum = 0;
        validatedOutput.scoringRubric.forEach((crit, index, arr) => {
            if(index < arr.length -1) {
                crit.weight = equalWeight;
                sum += equalWeight;
            } else {
                crit.weight = parseFloat((1.0 - sum).toFixed(2));
            }
        });
    }


    return validatedOutput;
  }
);
