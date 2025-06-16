
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
import type { QuestionDifficulty } from '@/types/interview-kit'; // For difficultyTimeMap

// This map is used in post-processing if AI doesn't provide estimatedTimeMinutes
const difficultyTimeMap: Record<QuestionDifficulty, number> = {
  Naive: 2,
  Beginner: 4,
  Intermediate: 6,
  Expert: 8,
  Master: 10,
};

const GenerateInterviewKitInputSchema = z.object({
  jobDescription: z
    .string()
    .describe('The job description to generate an interview kit for.'),
  candidateExperienceContext: z.string().optional().describe('Optional brief context about the target candidate’s experience level, current role, or past tech stack. E.g., "Junior developer, 1-2 years exp, proficient in React" or "Senior architect, 10+ years, extensive AWS and microservices experience." This supplements the resume if provided.'),
  candidateResume: z.string().optional().describe('The full text of the candidate\'s resume, if provided. This should be a primary source for tailoring questions and model answers, alongside the job description. Analyze the resume deeply to extract skills, experiences, and projects to ask about.'),
});
export type GenerateInterviewKitInput = z.infer<typeof GenerateInterviewKitInputSchema>;

const QuestionAnswerPairSchema = z.object({
  question: z.string().describe('The interview question. Should be insightful and highly specific, directly derived from or probing into experiences, skills, projects, and claims made in the Candidate\'s Resume (if provided) and the Job Description, as well as any Candidate Experience Context.'),
  answer: z.string().describe("A model answer as 3-4 concise bullet points. Each bullet point MUST serve as a general example of a strong answer for this role and candidate profile – basic, clear, and easy to judge. Crucially, these answers must also demonstrate proficiency relevant to the candidate's specific experience level and background by EXPLICITLY referencing key terms, skills, projects, or experiences from the Job Description AND/OR the Candidate Resume/Context. Highlight positive indicators a recruiter should look for."),
  type: z.enum(['Technical', 'Scenario', 'Behavioral']).describe('The type of question. Technical for skills/tools, Scenario for problem-solving, Behavioral for past actions (STAR method).'),
  category: z.enum(['Technical', 'Non-Technical']).describe("The category of the question. 'Technical' for questions assessing specific hard skills or tool knowledge. 'Non-Technical' for questions assessing problem-solving, behavioral traits, scenarios, or soft skills. Infer this primarily from the question type and content."),
  difficulty: z.enum(['Naive', 'Beginner', 'Intermediate', 'Expert', 'Master']).describe("The difficulty level of the question, on a 5-point scale: 'Naive', 'Beginner', 'Intermediate', 'Expert', 'Master'."),
  estimatedTimeMinutes: z.number().describe('Suitable estimated time in minutes a candidate might need for a thorough answer, considering question complexity and experience level. Default suggestions: Naive(2), Beginner(4), Intermediate(6), Expert(8), Master(10).'),
});

const CompetencySchema = z.object({
  name: z.string().describe('The name of the competency, derived from the job description.'),
  importance: z.enum(['High', 'Medium', 'Low']).describe('The importance of this competency for the role, based on the job description.'),
  questions: z.array(QuestionAnswerPairSchema).describe('The questions for the competency. Aim for a mix of Technical, Scenario, and Behavioral questions, tailored to the job description and candidate profile. Questions should actively probe claims and details found in the candidate\'s resume, including specific projects.'),
});

const ScoringCriterionSchema = z.object({
  criterion: z.string().describe('A high-quality, distinct scoring criterion that is actionable and measurable. It MUST explicitly mention key phrases, skills, concepts, or project types from the Job Description AND/OR the Candidate Resume/Context. The set of criteria MUST provide a broad yet deeply contextual basis for comprehensive candidate evaluation.'),
  weight: z.number().describe('The weight of this criterion (a value between 0.0 and 1.0). All criterion weights in the rubric must sum to 1.0.'),
});

const GenerateInterviewKitOutputSchema = z.object({
  competencies: z.array(CompetencySchema).describe('The 5-7 core competencies for the job, including their importance and tailored questions.'),
  scoringRubric: z
    .array(ScoringCriterionSchema)
    .describe('The 3-5 weighted scoring rubric criteria for the interview. Criteria MUST be contextually derived, explicitly referencing key phrases from the Job Description AND/OR Candidate Resume/Context to provide a broad yet deeply contextual basis for comprehensive candidate evaluation.'),
});
export type GenerateInterviewKitOutput = z.infer<typeof GenerateInterviewKitOutputSchema>;

export async function generateInterviewKit(input: GenerateInterviewKitInput): Promise<GenerateInterviewKitOutput> {
  return generateInterviewKitFlow(input);
}

const generateInterviewKitPrompt = ai.definePrompt({
  name: 'generateInterviewKitPrompt',
  input: {schema: GenerateInterviewKitInputSchema},
  output: {schema: GenerateInterviewKitOutputSchema},
  prompt: `Critical: Before generating any content, take the time to thoroughly analyze and synthesize ALL provided details about the job, the candidate (from their resume, if provided, which should be treated as a primary source for question inspiration, including specific projects mentioned), and any specific experience context. Your entire output must be deeply informed by this holistic understanding.

You are a senior hiring manager and expert interviewer. Your task is to generate a comprehensive interview kit. You MUST thoroughly analyze and synthesize ALL provided information: the Job Description, the Candidate Resume (if available - analyze it deeply to extract skills, experiences, and **projects to ask about**), and any Candidate Experience Context. Your output should be deeply tailored and highly practical, reflecting a complete understanding of these inputs.

Job Description:
{{{jobDescription}}}

{{#if candidateResume}}
Candidate Resume:
{{{candidateResume}}}
{{/if}}

{{#if candidateExperienceContext}}
Candidate Experience Context (additional notes on candidate's background, years of experience, current role, past tech stack, etc.):
{{{candidateExperienceContext}}}
{{/if}}

Based on a holistic understanding of ALL available information (Job Description, Candidate Resume, and Candidate Experience Context):

1.  Identify 5-7 core competencies crucial for the role as per the Job Description. For each competency, assess its importance (High, Medium, or Low).
2.  For each competency, create 3 distinct, insightful questions:
    *   One Technical Question: Probes specific technical skills, tools, or platform knowledge relevant to the JD and candidate's background (from resume/context).
    *   One Scenario-based Question: Presents a realistic work-related challenge reflecting the JD's demands and candidate's experience level (from resume/context).
    *   One Behavioral Question: Assesses past behavior (STAR method), ideally probing experiences mentioned in the resume or required by the JD.
    These questions must be sharply tailored to the specifics of the Job Description and **directly derived from or probe into experiences, skills, projects, and claims made in the Candidate's Resume** (if provided) and any Candidate Experience Context.

3.  For EACH question, provide all the fields as specified in the output schema, paying close attention to the descriptions:
    *   \\\`question\\\`: The text of the question.
    *   \\\`answer\\\`: A model answer as 3-4 concise bullet points. Each bullet point MUST serve as a general example of a strong answer for this role and candidate profile – basic, clear, and easy to judge. Crucially, these answers must also demonstrate proficiency relevant to the candidate's specific experience level and background by EXPLICITLY referencing key terms, skills, projects, or experiences from the Job Description AND/OR the Candidate Resume/Context. Highlight positive indicators a recruiter should look for.
    *   \\\`type\\\`: The type of question ('Technical', 'Scenario', 'Behavioral').
    *   \\\`category\\\`: The category of the question ('Technical' or 'Non-Technical'). 'Technical' questions assess specific hard skills/tools. 'Non-Technical' questions (typically Scenario or Behavioral) assess problem-solving, behavioral traits, or soft skills. Assign based on question type and content.
    *   \\\`difficulty\\\`: The difficulty level from this exact 5-level scale: 'Naive', 'Beginner', 'Intermediate', 'Expert', 'Master'. Assign based on JD requirements and candidate's apparent skill level.
    *   \\\`estimatedTimeMinutes\\\`: A suitable estimated time in minutes a candidate might need for a thorough answer, considering question complexity and the candidate's experience. Default suggestions: Naive(2), Beginner(4), Intermediate(6), Expert(8), Master(10).
4.  Create a scoring rubric with 3-5 weighted criteria. Each criterion MUST be a high-quality, distinct evaluation parameter, actionable, measurable, and explicitly mention key phrases, skills, concepts, or project types from the Job Description AND/OR the Candidate Resume/Context. The set of criteria MUST provide a broad yet deeply contextual basis for evaluating the candidate comprehensively. Ensure criterion weights sum to 1.0.

Return a JSON object adhering to the specified output schema. Ensure all fields are populated.
The goal is to produce highly relevant, tailored questions (actively drawing from the resume, including specific projects where possible) with concise, judgeable model answers that serve as general examples of strong responses, and a deeply contextual scoring rubric, all meticulously informed by the Job Description and the candidate's specific background and experience.
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
          answer: q.answer || "Missing model answer (should be 3-4 bullet points referencing JD/resume/projects/context, serving as a general example of a strong answer).",
          type: q.type || "Behavioral",
          category: q.category || (q.type === 'Technical' ? 'Technical' : 'Non-Technical'),
          difficulty: q.difficulty || "Intermediate",
          estimatedTimeMinutes: q.estimatedTimeMinutes || (difficultyTimeMap[q.difficulty || "Intermediate"]),
        })),
      })),
      scoringRubric: (output.scoringRubric || []).map(crit => ({
        criterion: crit.criterion || "Unnamed Criterion (should reference JD/resume/projects/context for a broad yet contextual evaluation)",
        weight: typeof crit.weight === 'number' ? Math.max(0, Math.min(1, crit.weight)) : 0.2,
      })),
    };
     // Ensure rubric weights sum to 1.0
    let totalWeight = validatedOutput.scoringRubric.reduce((sum, crit) => sum + crit.weight, 0);
    if (validatedOutput.scoringRubric.length > 0) {
        if (totalWeight === 0) { // If all weights are 0, distribute equally
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
        } else if (totalWeight !== 1.0) { // If weights are non-zero but don't sum to 1.0, normalize
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
        }
    }

    // Final check and adjustment if sum is still not 1.0 due to rounding
    let finalSum = validatedOutput.scoringRubric.reduce((sum, crit) => sum + crit.weight, 0);
    if (finalSum !== 1.0 && validatedOutput.scoringRubric.length > 0) {
        const diff = 1.0 - finalSum;
        const lastCrit = validatedOutput.scoringRubric[validatedOutput.scoringRubric.length-1];
        lastCrit.weight = parseFloat(Math.max(0, lastCrit.weight + diff).toFixed(2));
         // Ensure no weight is negative after adjustment
        if (lastCrit.weight < 0) {
            lastCrit.weight = 0;
            let currentTotal = validatedOutput.scoringRubric.reduce((s,c) => s + c.weight, 0);
            if (currentTotal < 1.0 && validatedOutput.scoringRubric.length > 1) {
                 const remainingDiff = 1.0 - currentTotal;
                 const otherCrits = validatedOutput.scoringRubric.filter(c => c !== lastCrit);
                 if (otherCrits.length > 0) {
                    const adjustmentPerCrit = remainingDiff / otherCrits.length;
                    otherCrits.forEach(c => c.weight = parseFloat(Math.max(0, c.weight + adjustmentPerCrit).toFixed(2)));
                 }
            }
            finalSum = validatedOutput.scoringRubric.reduce((s,c) => s + c.weight, 0);
            if (finalSum !== 1.0) {
                const finalDiff = 1.0 - finalSum;
                const primaryTarget = validatedOutput.scoringRubric.find(c => c.weight > 0 && c !== lastCrit) || validatedOutput.scoringRubric[0];
                primaryTarget.weight = parseFloat(Math.max(0, primaryTarget.weight + finalDiff).toFixed(2));
            }

        }
    }
    return validatedOutput;
  }
);
    
