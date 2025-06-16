
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
    .describe('The job description to generate an interview kit for. This is a primary source material.'),
  candidateExperienceContext: z.string().optional().describe('Optional brief context about the target candidate’s experience level, current role, or past tech stack. E.g., "Junior developer, 1-2 years exp, proficient in React" or "Senior architect, 10+ years, extensive AWS and microservices experience." This supplements the resume if provided.'),
  candidateResume: z.string().optional().describe("The full text of the candidate's resume, if provided. This is a primary source material for tailoring questions and model answers. Analyze the resume deeply to extract skills, experiences, specific projects (including their tech stack, goals, accomplishments, challenges), educational background, academic achievements, and past work experiences to ask about."),
});
export type GenerateInterviewKitInput = z.infer<typeof GenerateInterviewKitInputSchema>;

const QuestionAnswerPairSchema = z.object({
  question: z.string().describe('The interview question. Should be insightful and highly specific, directly derived from or probing into experiences, skills, projects (including their tech stack, goals, accomplishments, challenges), educational background, academic achievements, and past work experiences, and claims made in the Candidate\'s Resume (if provided) and the Job Description, as well as any Candidate Experience Context. This includes potentially asking "Tell me about yourself".'),
  answer: z.string().describe("A model answer as 3-4 concise bullet points. Each bullet point MUST serve as a **general example of a strong answer** for this role and candidate profile – basic, clear, and easy to judge. These points should guide the interviewer on what a good answer might cover, and MUST be informed by proficiency relevant to the candidate's specific work experience, past experiences (from resume/context, including projects and their specifics, educational background, academic achievements) and background by EXPLICITLY referencing key terms, skills, projects, or experiences from the Job Description AND/OR the Candidate Resume/Context (including specific project details, educational background, and past work experiences). For 'Tell me about yourself', if a resume is provided, the model answer MUST be specifically tailored to outline 3-4 key points a strong candidate would ideally cover based on THEIR specific resume, considering their work history, projects, educational background, and academic achievements. For resume project deep-dive questions, the model answer should guide the interviewer on what to listen for regarding project goals, tech stack, accomplishments, and challenges."),
  type: z.enum(['Technical', 'Scenario', 'Behavioral']).describe('The type of question. Technical for skills/tools, Scenario for problem-solving, Behavioral for past actions (STAR method).'),
  category: z.enum(['Technical', 'Non-Technical']).describe("The category of the question. 'Technical' for questions assessing specific hard skills or tool knowledge. 'Non-Technical' for questions assessing problem-solving, behavioral traits, scenarios, or soft skills (like 'Tell me about yourself'). Infer this primarily from the question type and content."),
  difficulty: z.enum(['Naive', 'Beginner', 'Intermediate', 'Expert', 'Master']).describe("The difficulty level of the question, on a 5-point scale: 'Naive', 'Beginner', 'Intermediate', 'Expert', 'Master'. Assign based on JD requirements and candidate's apparent skill level."),
  estimatedTimeMinutes: z.number().describe('Suitable estimated time in minutes a candidate might need for a thorough answer, considering question complexity and experience level. Default suggestions: Naive(2), Beginner(4), Intermediate(6), Expert(8), Master(10).'),
});

const CompetencySchema = z.object({
  name: z.string().describe('The name of the competency, derived from the job description and potentially informed by resume specifics (including educational background and academic achievements). One competency might be "Candidate Introduction & Background" or similar to house introductory questions.'),
  importance: z.enum(['High', 'Medium', 'Low']).describe('The importance of this competency for the role, based on the job description.'),
  questions: z.array(QuestionAnswerPairSchema).describe('The questions for the competency. Questions should be generated in a logical sequence: introductory questions first (like "Tell me about yourself", academic background, general experience), then project-specific questions, followed by other technical/scenario/behavioral questions. Questions should actively probe claims and details found in the candidate\'s resume, including specific projects (their tech stack, goals, accomplishments, challenges), educational background, academic achievements, and past work experiences.'),
});

const ScoringCriterionSchema = z.object({
  criterion: z.string().describe('A well-defined, distinct, and high-quality scoring criterion. It must be actionable, measurable, and directly relevant to assessing candidate suitability for the role. Each criterion MUST explicitly mention key phrases, skills, concepts, project types, or relevant academic achievements from the Job Description AND/OR the Candidate Resume/Context (including specific project details, educational background, academic achievements, and past work experiences). The set of criteria MUST provide a broad yet deeply contextual basis for comprehensive candidate evaluation.'),
  weight: z.number().describe('The weight of this criterion (a value between 0.0 and 1.0). All criterion weights in the rubric must sum to 1.0.'),
});

const GenerateInterviewKitOutputSchema = z.object({
  competencies: z.array(CompetencySchema).describe('An array of 5-7 core competencies for the job. The first competency should ideally cover "Candidate Introduction & Background" including "Tell me about yourself", academic background, and general experience questions. Subsequent competencies should cover skills/projects, with questions sequenced logically. Competencies themselves should be informed by the holistic analysis of JD and candidate profile (including educational background and academic achievements from resume).'),
  scoringRubric: z
    .array(ScoringCriterionSchema)
    .describe('The 3-5 weighted scoring rubric criteria for the interview. Criteria MUST be contextually derived, well-defined, distinct, high-quality, actionable, measurable, and explicitly referencing key phrases from the Job Description AND/OR Candidate Resume/Context (including specific project details, educational background, academic achievements, and past work experiences) to provide a broad yet deeply contextual basis for comprehensive candidate evaluation.'),
});
export type GenerateInterviewKitOutput = z.infer<typeof GenerateInterviewKitOutputSchema>;

export async function generateInterviewKit(input: GenerateInterviewKitInput): Promise<GenerateInterviewKitOutput> {
  return generateInterviewKitFlow(input);
}

const generateInterviewKitPrompt = ai.definePrompt({
  name: 'generateInterviewKitPrompt',
  input: {schema: GenerateInterviewKitInputSchema},
  output: {schema: GenerateInterviewKitOutputSchema},
  prompt: `Critical: Before generating any content, take the time to thoroughly analyze and synthesize ALL provided user details: the Job Description, the Candidate Resume (if available, including specific projects, their tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), and any Candidate Experience Context. The Job Description and Candidate Resume (if provided) serve as PRIMARY SOURCE MATERIALS. Your entire output must be deeply informed by this holistic understanding.

You are a senior hiring manager and expert interviewer. Your task is to generate a comprehensive interview kit. You MUST thoroughly analyze and synthesize ALL provided information: the Job Description (primary source), the Candidate Resume (primary source if available - analyze it deeply to extract skills, experiences, **projects to ask about, including their tech stack, goals, accomplishments, challenges, educational background, academic achievements, and details from past work experiences**), and any Candidate Experience Context. Your output should be deeply tailored and highly practical, reflecting a complete understanding of these inputs.

Job Description (Primary Source):
{{{jobDescription}}}

{{#if candidateResume}}
Candidate Resume (Primary Source - analyze for specific projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences):
{{{candidateResume}}}
{{/if}}

{{#if candidateExperienceContext}}
Candidate Experience Context (additional notes on candidate's background, years of experience, current role, past tech stack, etc., to supplement primary sources):
{{{candidateExperienceContext}}}
{{/if}}

Based on a holistic understanding of ALL available information:

1.  **Structure the Interview Flow and Identify Competencies**:
    *   Start by defining a competency named "Candidate Introduction & Background" (or similar). This competency should house introductory questions. Assign it an appropriate importance level.
    *   Then, identify 4-6 other core competencies crucial for the role as per the Job Description, potentially informed by the Candidate Resume (including educational background and academic achievements). For each of these competencies, assess its importance (High, Medium, or Low).

2.  **Generate Questions in a Logical Sequence**:
    *   **For the "Candidate Introduction & Background" competency**:
        *   Begin with a "Tell me about yourself" question.
        *   Follow with questions probing the candidate's **academic background, qualifications, and relevant academic achievements** (if detailed in the resume and pertinent to the role).
        *   Then, include questions about their overall **work experience** (if detailed in the resume and relevant).
    *   **For all other competencies**:
        *   Prioritize **Resume Project Deep-Dive Question(s)**: If a Candidate Resume is provided, ensure questions **directly probe into specific projects listed**. These questions should aim to uncover details such as: "Regarding Project X mentioned on your resume, could you describe the tech stack you used, the primary goals of the project, what you accomplished, and any significant challenges you overcame?" or "Tell me about your role and contributions in Project Y, especially how you handled [specific challenge/goal mentioned in project description]."
        *   Follow with other distinct, insightful questions (aim for 2-3 total per competency, including project questions):
            *   One Technical Question (if applicable for the competency): Probes specific technical skills, tools, or platform knowledge relevant to the JD and candidate's background (from resume/context, including specific tech stack used in projects).
            *   One Scenario-based Question: Presents a realistic work-related challenge reflecting the JD's demands and candidate's experience level (from resume/context).
            *   One Behavioral Question: Assesses past behavior (STAR method), ideally probing experiences mentioned in the resume (e.g., challenges faced in projects, accomplishments, or points from their educational/academic background if highly relevant) or required by the JD.
    *   All questions must be sharply tailored to the specifics of the Job Description and **directly derived from or probe into experiences, skills, projects (including their tech stack, goals, accomplishments, challenges), educational background, academic achievements, and past work experiences, and claims made in the Candidate's Resume** (if provided) and any Candidate Experience Context.

3.  **For EACH question, provide all fields as specified in the output schema**:
    *   \`question\`: The text of the question.
    *   \`answer\`: A model answer as 3-4 concise bullet points.
        *   Each bullet point MUST serve as a **general example of a strong answer** for this role and candidate profile – basic, clear, and easy to judge. These points should guide the interviewer on what a good answer might cover, and MUST be informed by proficiency relevant to the candidate's **specific work experience, past experiences (from resume/context, including projects and their specific details like tech stack, goals, accomplishments, challenges, educational background, academic achievements)** and background by EXPLICITLY referencing key terms, skills, **projects**, or experiences from the Job Description AND/OR the Candidate Resume/Context. Highlight positive indicators a recruiter should look for.
        *   For "Tell me about yourself": If a resume is provided, the model answer MUST be specifically tailored to the candidate's resume. It should outline 3-4 key bullet points a strong candidate, based on *their specific resume* (considering their work history, projects, **educational background, and academic achievements**), would ideally cover.
        *   For resume project deep-dive questions: The model answer should guide the interviewer on what to listen for, e.g., "Candidate clearly articulates project goals and their role; Details specific technologies used (from resume/JD context); Quantifies accomplishments where possible (aligning with resume claims); Describes challenges (e.g., technical, team, timeline) and demonstrates problem-solving approaches."
        *   For resume educational/academic background questions: Model answers should guide on assessing the relevance and depth of understanding related to their academic experiences.
    *   \`type\`: The type of question ('Technical', 'Scenario', 'Behavioral').
    *   \`category\`: The category of the question ('Technical' or 'Non-Technical'). 'Technical' questions assess specific hard skills/tools. 'Non-Technical' questions (typically Scenario or Behavioral, including "Tell me about yourself") assess problem-solving, behavioral traits, or soft skills. Assign based on question type and content.
    *   \`difficulty\`: The difficulty level from this exact 5-level scale: 'Naive', 'Beginner', 'Intermediate', 'Expert', 'Master'. Assign based on JD requirements and candidate's apparent skill level.
    *   \`estimatedTimeMinutes\`: A suitable estimated time in minutes a candidate might need for a thorough answer, considering question complexity and the candidate's experience. Default suggestions: Naive(2), Beginner(4), Intermediate(6), Expert(8), Master(10).
4.  Create a scoring rubric with 3-5 weighted criteria. Each criterion MUST be a **well-defined, distinct, and high-quality** scoring criterion. It must be actionable, measurable, and directly relevant to assessing candidate suitability for the role. Each criterion MUST explicitly mention key phrases, skills, concepts, project types, or relevant academic achievements from the Job Description AND/OR the Candidate Resume/Context (including specific project details, educational background, academic achievements, or past work experiences). The set of criteria MUST provide a **broad yet deeply contextual** basis for comprehensive candidate evaluation. Ensure criterion weights sum to 1.0.

Return a JSON object adhering to the specified output schema. Ensure all fields are populated.
The goal is to produce a logically sequenced interview kit with highly relevant, tailored questions (actively drawing from the resume, including specific projects, their tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences) with concise, judgeable model answers that serve as general examples of strong responses (and for 'Tell me about yourself', a resume-specific guide outlining what points covered from their resume would indicate a strong answer), and a deeply contextual, well-defined, and comprehensive scoring rubric, all meticulously informed by the Job Description and the candidate's specific background and experience (including their past work history, projects, and education).
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
          question: q.question || "Missing question text. AI should generate this.",
          answer: q.answer || "Missing model answer. AI should provide general example answer (3-4 bullet points) covering key points, informed by JD/resume/context.",
          type: q.type || "Behavioral",
          category: q.category || (q.type === 'Technical' ? 'Technical' : 'Non-Technical'),
          difficulty: q.difficulty || "Intermediate",
          estimatedTimeMinutes: q.estimatedTimeMinutes || (difficultyTimeMap[q.difficulty || "Intermediate"]),
        })),
      })),
      scoringRubric: (output.scoringRubric || []).map(crit => ({
        criterion: crit.criterion || "Unnamed Criterion (must be well-defined, distinct, high-quality, actionable, measurable, and contextually reference JD/resume/projects/education/context for comprehensive evaluation). AI should refine this.",
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
        } else if (Math.abs(totalWeight - 1.0) > 0.001) { // If weights are non-zero but don't sum to 1.0 (with tolerance for float issues)
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
    if (Math.abs(finalSum - 1.0) > 0.001 && validatedOutput.scoringRubric.length > 0) {
        const diff = 1.0 - finalSum;
        const lastCrit = validatedOutput.scoringRubric[validatedOutput.scoringRubric.length-1];
        lastCrit.weight = parseFloat(Math.max(0, lastCrit.weight + diff).toFixed(2));
         // Ensure no weight is negative after adjustment
        if (lastCrit.weight < 0) {
            lastCrit.weight = 0;
            let currentTotal = validatedOutput.scoringRubric.reduce((s,c) => s + c.weight, 0);
            if (Math.abs(currentTotal - 1.0) > 0.001 && validatedOutput.scoringRubric.length > 1) {
                 const remainingDiff = 1.0 - currentTotal;
                 const otherCrits = validatedOutput.scoringRubric.filter(c => c !== lastCrit);
                 if (otherCrits.length > 0) {
                    const adjustmentPerCrit = remainingDiff / otherCrits.length;
                    otherCrits.forEach(c => c.weight = parseFloat(Math.max(0, c.weight + adjustmentPerCrit).toFixed(2)));
                 }
            }
            finalSum = validatedOutput.scoringRubric.reduce((s,c) => s + c.weight, 0);
            if (Math.abs(finalSum - 1.0) > 0.001 && validatedOutput.scoringRubric.length > 0) { // If still not 1.0, adjust the one with most weight or first.
                const finalDiffToAdjust = parseFloat((1.0-finalSum).toFixed(2));
                let targetCrit = validatedOutput.scoringRubric.reduce((prev, current) => (prev.weight > current.weight) ? prev : current, validatedOutput.scoringRubric[0]);
                targetCrit.weight = parseFloat(Math.max(0, targetCrit.weight + finalDiffToAdjust).toFixed(2));
            }

        }
    }
    return validatedOutput;
  }
);
    
