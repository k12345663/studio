
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
  candidateExperienceContext: z.string().optional().describe('Optional context about the target candidate’s experience level, current role, or past tech stack. E.g., "Junior developer, 1-2 years exp, proficient in React" or "Senior architect, 10+ years, extensive AWS and microservices experience."'),
});
export type GenerateInterviewKitInput = z.infer<typeof GenerateInterviewKitInputSchema>;

const QuestionAnswerPairSchema = z.object({
  question: z.string().describe('The interview question. Should be insightful and specific to the job description and candidate experience level.'),
  answer: z.string().describe('The model answer for the question, presented as 3-4 concise bullet points. Each bullet should be basic, clear, easy to judge, demonstrate strong proficiency relevant to the experience level, and reference terms from the Job Description or candidateContext where appropriate. Highlight key positive indicators.'),
  type: z.enum(['Technical', 'Scenario', 'Behavioral']).describe('The type of question. Technical for skills/tools, Scenario for problem-solving, Behavioral for past actions (STAR).'),
  category: z.enum(['Technical', 'Non-Technical']).describe("The category of the question. 'Technical' for questions assessing specific hard skills or tool knowledge. 'Non-Technical' for questions assessing problem-solving, behavioral traits, scenarios, or soft skills. Infer this primarily from the question type and content."),
  difficulty: z.enum(['Naive', 'Beginner', 'Intermediate', 'Expert', 'Master']).describe("The difficulty level of the question, on a 5-point scale: 'Naive', 'Beginner', 'Intermediate', 'Expert', 'Master'."),
  estimatedTimeMinutes: z.number().describe('Suitable estimated time in minutes a candidate might need for a thorough answer, considering question complexity and experience level. Default suggestions: Naive(2), Beginner(4), Intermediate(6), Expert(8), Master(10).'),
});

const CompetencySchema = z.object({
  name: z.string().describe('The name of the competency.'),
  importance: z.enum(['High', 'Medium', 'Low']).describe('The importance of this competency for the role.'),
  questions: z.array(QuestionAnswerPairSchema).describe('The questions for the competency. Aim for a mix of Technical, Scenario, and Behavioral questions, tailored to the candidate experience context.'),
});

const ScoringCriterionSchema = z.object({
  criterion: z.string().describe('The scoring criterion. Should be actionable, clearly linked to job requirements, and explicitly mention key phrases or concepts from the Job Description or candidateContext.'),
  weight: z.number().describe('The weight of the criterion (must sum to 1.0).'),
});

const GenerateInterviewKitOutputSchema = z.object({
  competencies: z.array(CompetencySchema).describe('The 5-7 core competencies for the job, including their importance and tailored questions.'),
  scoringRubric: z
    .array(ScoringCriterionSchema)
    .describe('The 3-5 weighted scoring rubric criteria for the interview, contextually derived and referencing key phrases from the Job Description or candidateContext.'),
});
export type GenerateInterviewKitOutput = z.infer<typeof GenerateInterviewKitOutputSchema>;

export async function generateInterviewKit(input: GenerateInterviewKitInput): Promise<GenerateInterviewKitOutput> {
  return generateInterviewKitFlow(input);
}

const generateInterviewKitPrompt = ai.definePrompt({
  name: 'generateInterviewKitPrompt',
  input: {schema: GenerateInterviewKitInputSchema},
  output: {schema: GenerateInterviewKitOutputSchema},
  prompt: `You are a senior hiring manager and expert interviewer. You will be given a Job Description and, optionally, a Candidate Profile (candidateContext). Your task is to generate a comprehensive interview kit.

Job Description:
{{{jobDescription}}}

{{#if candidateExperienceContext}}
Candidate Profile / Context:
{{{candidateExperienceContext}}}
{{/if}}

Based on the Job Description and Candidate Profile/Context:

1.  Identify 5-7 core competencies crucial for the role. For each competency, assess its importance (High, Medium, or Low).
2.  For each competency, create 3 distinct, insightful questions:
    *   One Technical Question: Probes specific technical skills, tools, or platform knowledge.
    *   One Scenario-based Question: Presents a realistic work-related challenge.
    *   One Behavioral Question: Assesses past behavior (STAR method).
    These questions should be sharply tailored to the specifics of the Job Description and the Candidate Profile/Context.
3.  For EACH question, provide the following:
    *   \\\`question\\\`: The text of the question.
    *   \\\`answer\\\`: A model answer as 3-4 concise bullet points. Each bullet must be basic, clear, easy to judge, demonstrate proficiency relevant to the candidate's experience level, and ideally reference specific terms or concepts from the Job Description or Candidate Profile/Context.
    *   \\\`type\\\`: The type of question ('Technical', 'Scenario', 'Behavioral').
    *   \\\`category\\\`: The category of the question ('Technical' or 'Non-Technical'). 'Technical' questions assess specific hard skills/tools. 'Non-Technical' questions (typically Scenario or Behavioral) assess problem-solving, behavioral traits, or soft skills.
    *   \\\`difficulty\\\`: The difficulty level from this exact 5-level scale: 'Naive', 'Beginner', 'Intermediate', 'Expert', 'Master'.
    *   \\\`estimatedTimeMinutes\\\`: A suitable estimated time in minutes a candidate might need for a thorough answer, considering question complexity and experience level. Default suggestions: Naive(2), Beginner(4), Intermediate(6), Expert(8), Master(10).
4.  Create a scoring rubric with 3-5 weighted criteria. Each criterion MUST be actionable, measurable, and explicitly mention key phrases or concepts from the Job Description or Candidate Profile/Context to ensure strong contextual relevance. Ensure criterion weights sum to 1.0.

Return a JSON object adhering to the specified output schema. Ensure all fields are populated.
The goal is to produce highly relevant, tailored questions with concise, judgeable model answers, and a deeply contextual scoring rubric.
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
          answer: q.answer || "Missing model answer (should be 3-4 bullet points).",
          type: q.type || "Behavioral",
          category: q.category || (q.type === 'Technical' ? 'Technical' : 'Non-Technical'),
          difficulty: q.difficulty || "Intermediate", 
          estimatedTimeMinutes: q.estimatedTimeMinutes || (q.difficulty === 'Naive' ? 2 : q.difficulty === 'Beginner' ? 4 : q.difficulty === 'Intermediate' ? 6 : q.difficulty === 'Expert' ? 8 : q.difficulty === 'Master' ? 10 : 5),
        })),
      })),
      scoringRubric: (output.scoringRubric || []).map(crit => ({
        criterion: crit.criterion || "Unnamed Criterion (should reference JD/context)",
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

