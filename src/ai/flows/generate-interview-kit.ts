
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
  candidateExperienceContext: z.string().optional().describe('Optional context about the target candidate’s experience level or background to tailor questions and expected answer depth. E.g., "Looking for a junior developer with 1-2 years of experience." or "Seeking a senior architect with deep cloud knowledge."'),
});
export type GenerateInterviewKitInput = z.infer<typeof GenerateInterviewKitInputSchema>;

const QuestionAnswerPairSchema = z.object({
  question: z.string().describe('The interview question. Should be insightful and specific to the job description and candidate experience level.'),
  answer: z.string().describe('The model answer for the question. Should be basic, clear, easy to judge, and demonstrate strong proficiency relevant to the experience level. Highlight key positive indicators.'),
  type: z.enum(['Technical', 'Scenario', 'Behavioral']).describe('The type of question. Technical for skills/tools, Scenario for problem-solving, Behavioral for past actions (STAR).'),
  difficulty: z.enum(['Naive', 'Beginner', 'Intermediate', 'Expert', 'Master']).describe('The difficulty level of the question, on a 5-point scale.'),
  estimatedTimeMinutes: z.number().describe('Suitable estimated time in minutes a candidate might need for a thorough answer, considering question complexity and experience level.'),
});

const CompetencySchema = z.object({
  name: z.string().describe('The name of the competency.'),
  importance: z.enum(['High', 'Medium', 'Low']).describe('The importance of this competency for the role.'),
  questions: z.array(QuestionAnswerPairSchema).describe('The questions for the competency. Aim for a mix of Technical, Scenario, and Behavioral questions, tailored to the candidate experience context.'),
});

const ScoringCriterionSchema = z.object({
  criterion: z.string().describe('The scoring criterion. Should be actionable and clearly linked to job requirements and role title, demonstrating contextual understanding.'),
  weight: z.number().describe('The weight of the criterion (must sum to 1.0).'),
});

const GenerateInterviewKitOutputSchema = z.object({
  competencies: z.array(CompetencySchema).describe('The 5-7 core competencies for the job, including their importance and tailored questions.'),
  scoringRubric: z
    .array(ScoringCriterionSchema)
    .describe('The 4-5 weighted scoring rubric criteria for the interview, contextually derived from the job title and description.'),
});
export type GenerateInterviewKitOutput = z.infer<typeof GenerateInterviewKitOutputSchema>;

export async function generateInterviewKit(input: GenerateInterviewKitInput): Promise<GenerateInterviewKitOutput> {
  return generateInterviewKitFlow(input);
}

const generateInterviewKitPrompt = ai.definePrompt({
  name: 'generateInterviewKitPrompt',
  input: {schema: GenerateInterviewKitInputSchema},
  output: {schema: GenerateInterviewKitOutputSchema},
  prompt: `You are a senior hiring manager and expert interviewer. Given a job description and optional candidate experience context:

Job Description: {{{jobDescription}}}
{{#if candidateExperienceContext}}
Candidate Experience Context: {{{candidateExperienceContext}}}
{{/if}}

1. Identify 5-7 core competencies (e.g., specific skills, tools proficiency, soft-skills, relevant business outcomes). For each competency, assess its importance for the role (High, Medium, or Low).
2. For each competency, create 3 distinct, insightful questions, appropriately tailored to the provided candidate experience context (if any):
   * Technical Question: Probes specific technical skills, tools, or platform knowledge directly mentioned or implied in the job description.
   * Scenario-based Question: Presents a realistic work-related challenge or situation relevant to the role. Ask how the candidate would approach it.
   * Behavioral Question: Designed to assess past behavior (e.g., "Tell me about a time when..."). Focus on eliciting specific examples using the STAR method.
   For each question:
     - Provide a basic, clear, and easy-to-judge model answer an ideal candidate (matching the experience context) would give. This answer should highlight key positive indicators and demonstrate proficiency concisely.
     - Assign a difficulty level: 'Naive', 'Beginner', 'Intermediate', 'Expert', or 'Master'.
     - Estimate a suitable time in minutes a candidate might need for a thorough answer, considering the question's complexity and the candidate's experience level.
3. Provide a scoring rubric with 4-5 weighted criteria. These criteria must be actionable, measurable, and show a contextual understanding by being clearly linked to the most important requirements of the job description and the role's title. Ensure the weights sum to 1.0.

Return a JSON object that adheres to the following schema:
${GenerateInterviewKitOutputSchema.description}

Ensure your questions are not generic and are directly tailored to the specifics of the job description and any provided candidate experience context. Model answers must be concise and demonstrate proficiency for the target experience level. All competency, question, and rubric fields defined in the schema must be populated.
`,
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
     // Basic validation and default-filling for robustness
    const validatedOutput: GenerateInterviewKitOutput = {
      competencies: (output.competencies || []).map(comp => ({
        name: comp.name || "Unnamed Competency",
        importance: comp.importance || "Medium",
        questions: (comp.questions || []).map(q => ({
          question: q.question || "Missing question text",
          answer: q.answer || "Missing model answer",
          type: q.type || "Behavioral",
          difficulty: q.difficulty || "Intermediate", // Default difficulty
          estimatedTimeMinutes: q.estimatedTimeMinutes || 5,
        })),
      })),
      scoringRubric: (output.scoringRubric || []).map(crit => ({
        criterion: crit.criterion || "Unnamed Criterion",
        weight: typeof crit.weight === 'number' ? Math.max(0, Math.min(1, crit.weight)) : 0.2,
      })),
    };
     // Ensure rubric weights sum to 1.0
    const totalWeight = validatedOutput.scoringRubric.reduce((sum, crit) => sum + crit.weight, 0);
    if (totalWeight > 0 && totalWeight !== 1.0 && validatedOutput.scoringRubric.length > 0) {
      const factor = 1.0 / totalWeight;
      let sumOfNormalizedWeights = 0;
      validatedOutput.scoringRubric.forEach((crit, index, arr) => {
        if (index < arr.length -1) {
          crit.weight = parseFloat((crit.weight * factor).toFixed(2));
          sumOfNormalizedWeights += crit.weight;
        } else { 
          crit.weight = parseFloat(Math.max(0, (1.0 - sumOfNormalizedWeights)).toFixed(2));
        }
      });
      let finalSum = validatedOutput.scoringRubric.reduce((sum, crit) => sum + crit.weight, 0);
      if (finalSum !== 1.0 && validatedOutput.scoringRubric.length > 0) {
          const diff = 1.0 - finalSum;
          const lastCrit = validatedOutput.scoringRubric[validatedOutput.scoringRubric.length-1];
          lastCrit.weight = parseFloat(Math.max(0, lastCrit.weight + diff).toFixed(2));
      }
    } else if (totalWeight === 0 && validatedOutput.scoringRubric.length > 0) {
        const equalWeight = parseFloat((1.0 / validatedOutput.scoringRubric.length).toFixed(2));
        let sum = 0;
        validatedOutput.scoringRubric.forEach((crit, index, arr) => {
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
