
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
import type { QuestionDifficulty } from '@/types/interview-kit';

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
  candidateExperienceContext: z.string().optional().describe('Optional brief context about the target candidate’s experience level, current role, or past tech stack. E.g., "Junior developer, 1-2 years exp, proficient in React" or "Senior architect, 10+ years, extensive AWS and microservices experience." This supplements primary data sources.'),
  candidateResume: z.string().optional().describe("The full text of the candidate's resume (potentially from a pasted text, parsed PDF/DOC, or Unstop profile data). This is a primary source material for tailoring questions and model answers. Analyze it deeply to extract skills, experiences, specific projects (including their tech stack, goals, accomplishments, challenges), educational background, academic achievements, and past work experiences to ask about."),
});
export type GenerateInterviewKitInput = z.infer<typeof GenerateInterviewKitInputSchema>;

const QuestionAnswerPairSchema = z.object({
  question: z.string().describe('The interview question. Should be insightful and highly specific, directly derived from or probing into experiences, skills, projects (including their tech stack, goals, accomplishments, challenges), educational background, academic achievements, and past work experiences, and claims made in the Candidate\'s Resume/Profile (if provided) and the Job Description, as well as any Candidate Experience Context. This includes potentially asking "Tell me about yourself".'),
  answer: z.string().describe("A model answer from the RECRUITER'S PERSPECTIVE, presented as 3-4 concise bullet points. Each bullet point MUST outline KEY POINTS A CANDIDATE SHOULD COVER for a strong answer, making it easy for a non-technical recruiter to judge. These points should be generic enough to cover fundamental concepts (e.g., 'Candidate mentions the 4 pillars of OOP: Abstraction, Encapsulation, Inheritance, Polymorphism') yet be informed by the candidate's profile and JD. EXPLICITLY reference key terms, skills, projects, or experiences from the Job Description AND/OR the Candidate Resume/Profile (including specific project details, educational background, and past work experiences). Example: 'Look for: 1. Clear explanation of X. 2. Mention of Y. 3. Connection to Z.' Also, include a brief note if applicable: 'Note: If candidate provides relevant real-life examples beyond these core points, it indicates greater depth and may warrant higher marks or a positive note on their problem-solving skills.' For 'Tell me about yourself', if a resume/profile is provided, the model answer MUST guide the recruiter on key points from the candidate's specific background (work history, projects, education) that would constitute a strong introduction."),
  type: z.enum(['Technical', 'Scenario', 'Behavioral']).describe('The type of question. Technical for skills/tools, Scenario for problem-solving, Behavioral for past actions (STAR method).'),
  category: z.enum(['Technical', 'Non-Technical']).describe("The category of the question. 'Technical' for questions assessing specific hard skills or tool knowledge. 'Non-Technical' for questions assessing problem-solving, behavioral traits, scenarios, or soft skills (like 'Tell me about yourself'). Infer this primarily from the question type and content."),
  difficulty: z.enum(['Naive', 'Beginner', 'Intermediate', 'Expert', 'Master']).describe("The difficulty level of the question, on a 5-point scale: 'Naive', 'Beginner', 'Intermediate', 'Expert', 'Master'. Assign based on JD requirements and candidate's apparent skill level from resume/profile."),
  estimatedTimeMinutes: z.number().describe('Suitable estimated time in minutes a candidate might need for a thorough answer, considering question complexity and experience level. Default suggestions: Naive(2), Beginner(4), Intermediate(6), Expert(8), Master(10).'),
});

const CompetencySchema = z.object({
  name: z.string().describe('The name of the competency, derived from the job description and potentially informed by resume/profile specifics (including educational background and academic achievements). One competency might be "Candidate Introduction & Background" or similar to house introductory questions.'),
  importance: z.enum(['High', 'Medium', 'Low']).describe('The importance of this competency for the role, based on the job description.'),
  questions: z.array(QuestionAnswerPairSchema).describe('The questions for the competency. Questions should be generated in a logical sequence: introductory questions first (like "Tell me about yourself", academic background, general experience), then project-specific questions, followed by other technical/scenario/behavioral questions. Questions should actively probe claims and details found in the candidate\'s resume/profile, including specific projects (their tech stack, goals, accomplishments, challenges), educational background, academic achievements, and past work experiences.'),
});

const ScoringCriterionSchema = z.object({
  criterion: z.string().describe("A well-defined, distinct, and high-quality scoring criterion for a non-technical recruiter to use. It must be actionable, measurable, and directly relevant to assessing candidate suitability. Focus on parameters like 'Clarity of Explanation', 'Relevance of Answer to Question', 'Depth of Understanding (as evidenced by examples or detail)', 'Problem-Solving Approach', 'Communication Skills'. Each criterion MUST explicitly mention key phrases, skills, concepts, project types, or relevant academic achievements from the Job Description AND/OR the Candidate Resume/Profile (including specific project details, educational background, academic achievements, and past work experiences) where appropriate to make it contextual. The set of criteria MUST provide a broad yet deeply contextual basis for comprehensive candidate evaluation, understandable by someone not expert in the role's domain."),
  weight: z.number().describe('The weight of this criterion (a value between 0.0 and 1.0). All criterion weights in the rubric must sum to 1.0.'),
});

const GenerateInterviewKitOutputSchema = z.object({
  competencies: z.array(CompetencySchema).describe('An array of 4-6 core competencies for the job. The first competency should ideally cover "Candidate Introduction & Background" including "Tell me about yourself", academic background, and general experience questions. Subsequent competencies should cover skills/projects, with questions sequenced logically. Competencies themselves should be informed by the holistic analysis of JD and candidate profile (including educational background and academic achievements from resume/profile).'),
  scoringRubric: z
    .array(ScoringCriterionSchema)
    .describe("The 3-5 weighted scoring rubric criteria for the interview. Criteria MUST be contextually derived, well-defined, distinct, high-quality, actionable, measurable, and explicitly referencing key phrases from the Job Description AND/OR Candidate Resume/Profile (including specific project details, educational background, academic achievements, and past work experiences) to provide a broad yet deeply contextual basis for comprehensive candidate evaluation. Frame criteria to be easily usable by a non-technical recruiter, focusing on aspects like clarity, relevance, and depth. For example: 'Criterion: Technical Communication Clarity. Weight: 0.3. (Assesses how clearly the candidate explains technical concepts from the JD/resume, like [specific skill/project from JD/resume])'"),
});
export type GenerateInterviewKitOutput = z.infer<typeof GenerateInterviewKitOutputSchema>;

export async function generateInterviewKit(input: GenerateInterviewKitInput): Promise<GenerateInterviewKitOutput> {
  return generateInterviewKitFlow(input);
}

const generateInterviewKitPrompt = ai.definePrompt({
  name: 'generateInterviewKitPrompt',
  input: {schema: GenerateInterviewKitInputSchema},
  output: {schema: GenerateInterviewKitOutputSchema},
  prompt: `You are a highly experienced hiring manager and recruiter with 25 years of experience, specializing in creating effective interview kits for various roles. You are adept at designing questions and evaluation parameters that can be used by recruiters who may not be technical experts in the role's domain. Your primary task is to generate a comprehensive interview kit.
CRITICAL: Before generating any content, you MUST thoroughly analyze and synthesize ALL provided user inputs: the Job Description (primary source), the Candidate Resume/Profile data (primary source if provided; analyze it deeply to extract skills, experiences, specific projects including their tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), and any Candidate Experience Context. Your entire output must be deeply informed by this holistic understanding to create a tailored and effective interview kit.

Job Description (Primary Source):
{{{jobDescription}}}

{{#if candidateResume}}
Candidate Resume/Profile Data (Primary Source - analyze for specific projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences):
{{{candidateResume}}}
{{/if}}

{{#if candidateExperienceContext}}
Candidate Experience Context (additional notes on candidate's background, years of experience, current role, past tech stack, etc., to supplement primary sources):
{{{candidateExperienceContext}}}
{{/if}}

Based on a holistic understanding of ALL available information, generate the interview kit:

1.  **Structure the Interview Flow and Identify Competencies**:
    *   Start by defining a competency named "Candidate Introduction & Background" (or similar). This competency should house introductory questions. Assign it an appropriate importance level.
    *   Then, identify 3-5 other core competencies crucial for the role as per the Job Description, potentially informed by the Candidate Resume/Profile (including educational background and academic achievements). For each of these competencies, assess its importance (High, Medium, or Low).

2.  **Generate Questions in a Logical Sequence**:
    *   **For the "Candidate Introduction & Background" competency**:
        *   Begin with a "Tell me about yourself" question.
        *   Follow with questions probing the candidate's **academic background, qualifications, and relevant academic achievements** (if detailed in the resume/profile and pertinent to the role).
        *   Then, include questions about their overall **work experience** (if detailed in the resume/profile and relevant).
    *   **For all other competencies**:
        *   Prioritize **Resume Project Deep-Dive Question(s)**: If a Candidate Resume/Profile is provided, ensure questions **directly probe into specific projects listed**. These questions should aim to uncover details such as: "Regarding Project X mentioned on your resume/profile, could you describe the tech stack you used, the primary goals of the project, what you accomplished, and any significant challenges you overcame?" or "Tell me about your role and contributions in Project Y, especially how you handled [specific challenge/goal mentioned in project description]."
        *   Follow with other distinct, insightful questions (aim for 2-3 total per competency, including project questions):
            *   One Technical Question (if applicable for the competency): Probes specific technical skills, tools, or platform knowledge relevant to the JD and candidate's background (from resume/profile/context, including specific tech stack used in projects).
            *   One Scenario-based Question: Presents a realistic work-related challenge reflecting the JD's demands and candidate's experience level (from resume/profile/context).
            *   One Behavioral Question: Assesses past behavior (STAR method), ideally probing experiences mentioned in the resume/profile (e.g., challenges faced in projects, accomplishments, or points from their educational/academic background if highly relevant) or required by the JD.
    *   All questions must be sharply tailored to the specifics of the Job Description and **directly derived from or probe into experiences, skills, projects (including their tech stack, goals, accomplishments, challenges), educational background, academic achievements, and past work experiences, and claims made in the Candidate's Resume/Profile** (if provided) and any Candidate Experience Context.

3.  **For EACH question, provide all fields as specified in the output schema**:
    *   \`question\`: The text of the question.
    *   \`answer\`: A model answer FROM THE RECRUITER'S PERSPECTIVE as 3-4 concise bullet points. Each bullet point MUST outline KEY POINTS A CANDIDATE SHOULD COVER for a strong answer, making it easy for a non-technical recruiter to judge. These points should be generic enough to cover fundamental concepts (e.g., 'Candidate explains the core purpose of a REST API') yet be informed by the candidate's profile and JD. EXPLICITLY reference key terms, skills, projects, or experiences from the Job Description AND/OR the Candidate Resume/Profile. Example: "Interviewer should listen for: 1. Mentions core concept A. 2. Explains B related to [JD skill/Resume project]. 3. Connects to C." Include a brief note if applicable: "Note: If candidate provides relevant real-life examples beyond these core points, it indicates greater depth." For 'Tell me about yourself', if a resume/profile is provided, the model answer MUST guide the recruiter on key points from the candidate's specific background (work history, projects, education) that would constitute a strong introduction. For resume project deep-dive questions, the model answer should guide the interviewer on what to listen for regarding project goals, tech stack, accomplishments, and challenges.
    *   \`type\`: The type of question ('Technical', 'Scenario', 'Behavioral').
    *   \`category\`: The category of the question ('Technical' or 'Non-Technical').
    *   \`difficulty\`: The difficulty level from this exact 5-level scale: 'Naive', 'Beginner', 'Intermediate', 'Expert', 'Master'.
    *   \`estimatedTimeMinutes\`: A suitable estimated time in minutes.

4.  **Create a Scoring Rubric (for a non-technical recruiter)**:
    *   Generate 3-5 weighted criteria. Each criterion MUST be a **well-defined, distinct, and high-quality** scoring parameter that a non-technical recruiter can easily apply. Focus on aspects like 'Clarity of Explanation', 'Relevance of Answer', 'Depth of Understanding (evidenced by examples/detail)', 'Problem-Solving Approach', 'Communication Skills'.
    *   Each criterion MUST explicitly mention key phrases, skills, concepts, project types, or relevant academic achievements from the Job Description AND/OR the Candidate Resume/Profile (including specific project details, educational background, academic achievements, or past work experiences) where appropriate to make it contextual.
    *   The set of criteria MUST provide a **broad yet deeply contextual** basis for comprehensive candidate evaluation, ensuring it is understandable and usable by someone not expert in the role's domain. Ensure criterion weights sum to 1.0. Example: 'Criterion: Technical Communication - Clarity on [specific concept from JD/Resume]. Weight: 0.25.'

Return a JSON object adhering to the specified output schema. Ensure all fields are populated.
The goal is to produce a logically sequenced interview kit with highly relevant, tailored questions (actively drawing from the resume/profile, including specific projects, their tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences) with concise, judgeable model answers from a recruiter's perspective (highlighting key points to cover, and for 'Tell me about yourself', a resume-specific guide), and a deeply contextual, well-defined, and comprehensive scoring rubric usable by non-technical recruiters.
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
          answer: q.answer || "Missing model answer. AI should provide guidance from a recruiter's perspective on key points the candidate should cover, informed by JD/resume/profile/context. For 'Tell me about yourself', it should guide on what a candidate should cover from their resume/profile.",
          type: q.type || "Behavioral",
          category: q.category || (q.type === 'Technical' ? 'Technical' : 'Non-Technical'),
          difficulty: q.difficulty || "Intermediate",
          estimatedTimeMinutes: q.estimatedTimeMinutes || (difficultyTimeMap[q.difficulty || "Intermediate"]),
        })),
      })),
      scoringRubric: (output.scoringRubric || []).map(crit => ({
        criterion: crit.criterion || "Unnamed Criterion (must be well-defined, distinct, high-quality, actionable, measurable, contextually reference JD/resume/profile for comprehensive evaluation by a non-technical recruiter). AI should refine this.",
        weight: typeof crit.weight === 'number' ? Math.max(0, Math.min(1, crit.weight)) : 0.2,
      })),
    };
     // Ensure rubric weights sum to 1.0
    let totalWeight = validatedOutput.scoringRubric.reduce((sum, crit) => sum + crit.weight, 0);
    if (validatedOutput.scoringRubric.length > 0) {
        if (totalWeight === 0) {
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
        } else if (Math.abs(totalWeight - 1.0) > 0.001) {
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

    let finalSum = validatedOutput.scoringRubric.reduce((sum, crit) => sum + crit.weight, 0);
    if (Math.abs(finalSum - 1.0) > 0.001 && validatedOutput.scoringRubric.length > 0) {
        const diff = 1.0 - finalSum;
        const lastCrit = validatedOutput.scoringRubric[validatedOutput.scoringRubric.length-1];
        lastCrit.weight = parseFloat(Math.max(0, lastCrit.weight + diff).toFixed(2));
        if (lastCrit.weight < 0) {
            lastCrit.weight = 0;
            let currentTotal = validatedOutput.scoringRubric.reduce((s,c) => s + c.weight, 0);
            if (Math.abs(currentTotal - 1.0) > 0.001 && validatedOutput.scoringRubric.length > 1) {
                 const remainingDiff = 1.0 - currentTotal;
                 const otherCrits = validatedOutput.scoringRubric.filter(c => c !== lastCrit);
                 if (otherCrits.length > 0) {
                    const adjustmentPerCrit = parseFloat((remainingDiff / otherCrits.length).toFixed(2));
                    otherCrits.forEach(c => c.weight = parseFloat(Math.max(0, c.weight + adjustmentPerCrit).toFixed(2)));
                 }
            }
            finalSum = validatedOutput.scoringRubric.reduce((s,c) => s + c.weight, 0);
            if (Math.abs(finalSum - 1.0) > 0.001 && validatedOutput.scoringRubric.length > 0) {
                const finalDiffToAdjust = parseFloat((1.0-finalSum).toFixed(2));
                let targetCrit = validatedOutput.scoringRubric.reduce((prev, current) => (prev.weight > current.weight) ? prev : current, validatedOutput.scoringRubric[0]);
                targetCrit.weight = parseFloat(Math.max(0, targetCrit.weight + finalDiffToAdjust).toFixed(2));
            }
        }
    }
    return validatedOutput;
  }
);
    