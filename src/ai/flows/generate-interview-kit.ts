
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
  unstopProfileLink: z.string().optional().describe("The candidate's Unstop profile link. This is a primary source material if provided; AI should (conceptually) treat this as if accessing and deeply analyzing the candidate's entire live profile for skills, projects, experience, education, academic achievements. THIS IS A COMPULSORY INPUT from the user."),
  candidateResumeText: z.string().optional().describe("The full text conceptually extracted from the candidate's complete resume document (e.g., from an uploaded PDF/DOC or pasted text). This is an optional input, but if provided, it's a primary source material. Analyze it deeply as if reading the original document, to extract skills, experiences, specific projects (including their tech stack, goals, accomplishments, challenges), educational background, academic achievements, and past work experiences to ask about."),
  candidateExperienceContext: z.string().optional().describe('Optional brief context about the target candidate’s experience level, current role, or past tech stack. E.g., "Junior developer, 1-2 years exp, proficient in React" or "Senior architect, 10+ years, extensive AWS and microservices experience." This supplements primary data sources.'),
});
export type GenerateInterviewKitInput = z.infer<typeof GenerateInterviewKitInputSchema>;

const QuestionAnswerPairSchema = z.object({
  question: z.string().describe('The interview question. Should be insightful and highly specific, directly derived from or probing into experiences, skills, projects (including their tech stack, goals, accomplishments, challenges), educational background, academic achievements, and past work experiences, and claims made in the Candidate\'s Unstop Profile (compulsory input, conceptually treat as if analyzing the live profile) and/or Resume Text (optional input, treated as full text from PDF/DOC), the Job Description, as well as any Candidate Experience Context. This includes potentially asking "Tell me about yourself".'),
  answer: z.string().describe("A model answer from the INTERVIEWER'S PERSPECTIVE, presented as 3-4 concise bullet points. Each bullet point MUST outline KEY POINTS A CANDIDATE SHOULD COVER for a strong answer, making it exceptionally easy for a non-technical recruiter to judge. These points should serve as general examples of strong answers, reflecting core concepts (e.g., if OOP is asked, the answer should guide the recruiter to check for the 4 pillars: Abstraction, Encapsulation, Inheritance, Polymorphism, clearly listing them). While generally informed by the overall context (Job Description, candidate profile including Unstop link, resume text [treated as full text from PDF/DOC], projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), for some questions, the key points might focus on fundamental concepts or general best practices for answering, rather than requiring every point to be explicitly tied to a specific line in the Job Description. Answers must be basic, clear, and easy for a non-technical recruiter to evaluate. EXPLICITLY reference key terms, skills, projects, or experiences from the Job Description AND/OR the Candidate's Unstop Profile/Resume Text when crucial for context. Include guidance on evaluating real-life examples and relevant information shared by the candidate not present on the resume using a note like: 'Note: If the candidate provides relevant real-life examples or discusses experiences/skills not detailed on their resume/profile but clearly relevant to the role, this can indicate greater depth, initiative, or broader experience. The interviewer should assess the relevance and substance of such unstated information against the job requirements.' For 'Tell me about yourself', if a Unstop profile or resume text is available, the model answer MUST guide the interviewer on key points from the candidate's specific background (work history, projects from Unstop/resume, education, academic achievements) that would constitute a strong introduction, written from the interviewer's perspective, ensuring a non-technical recruiter can assess relevance and completeness."),
  type: z.enum(['Technical', 'Scenario', 'Behavioral']).describe('The type of question. Technical for skills/tools, Scenario for problem-solving, Behavioral for past actions (STAR method).'),
  category: z.enum(['Technical', 'Non-Technical']).describe("The category of the question. 'Technical' for questions assessing specific hard skills or tool knowledge. 'Non-Technical' for questions assessing problem-solving, behavioral traits, scenarios, or soft skills (like 'Tell me about yourself'). Infer this primarily from the question type and content."),
  difficulty: z.enum(['Naive', 'Beginner', 'Intermediate', 'Expert', 'Master']).describe("The difficulty level of the question, on a 5-point scale: 'Naive', 'Beginner', 'Intermediate', 'Expert', 'Master'. Assign based on JD requirements and candidate's apparent skill level from Unstop profile/resume text."),
  estimatedTimeMinutes: z.number().describe('Suitable estimated time in minutes a candidate might need for a thorough answer, considering question complexity and experience level. Default suggestions: Naive(2), Beginner(4), Intermediate(6), Expert(8), Master(10).'),
});

const CompetencySchema = z.object({
  name: z.string().describe('The name of the competency, derived from the job description and potentially informed by Unstop profile/resume specifics (including educational background and academic achievements). One competency might be "Candidate Introduction & Background" or similar to house introductory questions.'),
  importance: z.enum(['High', 'Medium', 'Low']).describe('The importance of this competency for the role, based on the job description.'),
  questions: z.array(QuestionAnswerPairSchema).describe('The questions for the competency. Questions should be generated in a logical sequence: introductory questions first (like "Tell me about yourself", academic background, general experience), then project-specific questions (derived from Unstop profile/resume text [treated as full text from PDF/DOC]), followed by other technical/scenario/behavioral questions. Questions should actively probe claims and details found in the candidate\'s Unstop profile/resume text, including specific projects (their tech stack, goals, accomplishments, challenges), educational background, academic achievements, and past work experiences.'),
});

const ScoringCriterionSchema = z.object({
  criterion: z.string().describe("A well-defined, distinct, and high-quality scoring criterion for a non-technical recruiter to use. It must be actionable, measurable, and directly relevant to assessing candidate suitability. Focus on parameters like 'Clarity of Explanation', 'Relevance of Answer to Question', 'Depth of Understanding (as evidenced by examples or detail, including relevant experiences shared during the interview that may not be on the resume)', 'Problem-Solving Approach', 'Communication Skills'. Each criterion MUST explicitly mention key phrases, skills, concepts, project types, or relevant academic achievements from the Job Description AND/OR the Candidate's Unstop Profile/Resume Text (treated as full text from PDF/DOC, including specific project details, educational background, academic achievements, and past work experiences) where appropriate to make it contextual. The set of criteria MUST provide a broad yet deeply contextual basis for comprehensive candidate evaluation, understandable by someone not expert in the role's domain."),
  weight: z.number().describe('The weight of this criterion (a value between 0.0 and 1.0). All criterion weights in the rubric must sum to 1.0.'),
});

const GenerateInterviewKitOutputSchema = z.object({
  competencies: z.array(CompetencySchema).describe('An array of 4-6 core competencies for the job. The first competency should ideally cover "Candidate Introduction & Background" including "Tell me about yourself", academic background, and general experience questions. Subsequent competencies should cover skills/projects (from Unstop profile/resume text [treated as full text from PDF/DOC]), with questions sequenced logically. Competencies themselves should be informed by the holistic analysis of JD and candidate profile (Unstop link/resume text, including educational background and academic achievements).'),
  scoringRubric: z
    .array(ScoringCriterionSchema)
    .describe("The 3-5 weighted scoring rubric criteria for the interview. Criteria MUST be contextually derived, well-defined, distinct, high-quality, actionable, measurable, and explicitly referencing key phrases from the Job Description AND/OR Candidate's Unstop Profile/Resume Text (treated as full text from PDF/DOC, including specific project details, educational background, academic achievements, and past work experiences, and guiding the interviewer to also consider relevant information shared by the candidate that may not be on the resume) to provide a broad yet deeply contextual basis for comprehensive candidate evaluation. Frame criteria to be easily usable by a non-technical recruiter, focusing on aspects like clarity, relevance, and depth. For example: 'Criterion: Technical Communication Clarity. Weight: 0.3. (Assesses how clearly the candidate explains technical concepts from the JD or mentioned in their Unstop profile/resume, like [specific skill/project], and any other relevant technical details they discuss.)'"),
});
export type GenerateInterviewKitOutput = z.infer<typeof GenerateInterviewKitOutputSchema>;

export async function generateInterviewKit(input: GenerateInterviewKitInput): Promise<GenerateInterviewKitOutput> {
  return generateInterviewKitFlow(input);
}

const generateInterviewKitPrompt = ai.definePrompt({
  name: 'generateInterviewKitPrompt',
  input: {schema: GenerateInterviewKitInputSchema},
  output: {schema: GenerateInterviewKitOutputSchema},
  prompt: `You are a highly experienced hiring manager and recruiter with 25 years of experience, acting as a supportive **recruiter companion**. Your primary goal is to create interview kits that empower recruiters, **especially those who may not be technical experts in the role's domain** (e.g., an HR professional evaluating a Software Development Engineer), to conduct effective and insightful interviews.
CRITICAL: Before generating content, **THOROUGHLY analyze and synthesize ALL provided inputs**. Act as an expert companion to the recruiter:
1.  Job Description (Primary Source).
2.  Unstop Profile Link (Primary Source - **COMPULSORY**, **conceptually treat this as if you are accessing and deeply analyzing the candidate's entire live profile** for skills, projects, experience, education, academic achievements).
3.  Candidate Resume Text (Primary Source - **OPTIONAL**, if provided, this is the **full text conceptually extracted from the candidate's complete resume document (e.g., PDF/DOC)**. Analyze it deeply as if reading the original document, for skills, projects [tech stack, goals, accomplishments, challenges], education, academic achievements, past work experiences).
4.  Candidate Experience Context (Supplements primary sources).
Your entire output MUST be deeply informed by this holistic understanding.

Job Description (Primary Source):
{{{jobDescription}}}

Unstop Profile Link (Primary Source - COMPULSORY, **conceptually treat as if accessing and deeply analyzing the live profile**):
{{{unstopProfileLink}}}

{{#if candidateResumeText}}
Candidate Resume Text (Primary Source - OPTIONAL, **treated as full text conceptually extracted from PDF/DOC**, analyze for specific projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences):
{{{candidateResumeText}}}
{{/if}}

{{#if candidateExperienceContext}}
Candidate Experience Context (additional notes):
{{{candidateExperienceContext}}}
{{/if}}

Based on a holistic understanding of ALL available information, generate the interview kit:

1.  **Structure the Interview Flow and Identify Competencies**:
    *   Start with a competency named "Candidate Introduction & Background."
    *   Identify 3-5 other core competencies from the JD, informed by the Unstop profile/resume text (including educational background and academic achievements). Assign importance (High, Medium, Low).

2.  **Generate Questions in a Logical Sequence**:
    *   **"Candidate Introduction & Background" competency**:
        *   "Tell me about yourself."
        *   Questions on academic background, qualifications, academic achievements (from Unstop profile/resume text).
        *   Questions on overall work experience (from Unstop profile/resume text).
    *   **Other competencies**:
        *   Prioritize **Resume/Profile Project Deep-Dive Question(s)**: If Unstop profile/resume text is provided, ensure questions **directly probe specific projects listed**. Ask about: "tech stack used, primary goals, accomplishments, and significant challenges overcome" for Project X, or "role and contributions in Project Y, especially how you handled [specific challenge/goal from project description]."
        *   Follow with other distinct, insightful questions (2-3 total per competency): Technical, Scenario, Behavioral, sharply tailored to JD and specifics from Unstop profile/resume text/context (projects, tech stack, goals, accomplishments, challenges, education, past experiences). For some general technical or behavioral questions, while informed by the overall context, the focus might be more on fundamental principles than direct JD mapping for every point.

3.  **For EACH question, provide all fields as specified in the output schema**:
    *   \`question\`: Text of the question.
    *   \`answer\`: A model answer FROM THE INTERVIEWER'S PERSPECTIVE (3-4 concise bullet points). Each bullet MUST outline KEY POINTS A CANDIDATE SHOULD COVER for a strong answer, making it **exceptionally easy for a non-technical recruiter to judge**. These points should serve as **general examples of strong answers**, reflecting core concepts (e.g., 'If OOP is asked, interviewer should note if candidate covers: 1. Abstraction. 2. Encapsulation. 3. Inheritance. 4. Polymorphism,' ensuring these pillars are clearly listed if relevant for a non-technical interviewer). While generally informed by the overall context (Job Description, candidate profile including Unstop link, resume text [treated as full text from PDF/DOC], projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), **for some questions, the key points might focus on fundamental concepts or general best practices for answering, rather than requiring every point to be explicitly tied to a specific line in the Job Description.** Answers must be **basic, clear, and easy for a non-technical recruiter to evaluate**. EXPLICITLY reference key terms, skills, projects, or experiences from JD AND/OR Unstop Profile/Resume Text when crucial for context. Include guidance on evaluating real-life examples and relevant information shared by the candidate not present on the resume using a note like: 'Note: If the candidate provides relevant real-life examples or discusses experiences/skills not detailed on their resume/profile but clearly relevant to the role, this can indicate greater depth, initiative, or broader experience. The interviewer should assess the relevance and substance of such unstated information against the job requirements.'
        For the "Tell me about yourself" question: if a Unstop profile or resume text is available, the model answer MUST be a guide for the INTERVIEWER. It should outline key points from the candidate's specific background (work history, projects from Unstop/resume, education, academic achievements) that would constitute a strong introduction. This model answer must be written from the interviewer's perspective to help a non-technical recruiter assess relevance and completeness against the candidate's documented profile, rather than being a script for the candidate.
        For resume project deep-dive questions, guide on what to listen for regarding project goals, tech stack, accomplishments, challenges.
    *   \`type\`: 'Technical', 'Scenario', 'Behavioral'.
    *   \`category\`: 'Technical' or 'Non-Technical'.
    *   \`difficulty\`: 'Naive', 'Beginner', 'Intermediate', 'Expert', 'Master'.
    *   \`estimatedTimeMinutes\`: Suitable time.

4.  **Create a Scoring Rubric (for a non-technical recruiter)**:
    *   3-5 weighted criteria. Each MUST be well-defined, distinct, high-quality, actionable, measurable, and **framed for easy use by a non-technical recruiter**. Focus on 'Clarity of Explanation', 'Relevance of Answer', 'Depth of Understanding (considering both resume-based and emergent relevant details)', etc.
    *   Each criterion MUST explicitly mention key phrases, skills, concepts, project types, or academic achievements from JD AND/OR Unstop Profile/Resume Text (treated as full text from PDF/DOC, including projects, education, past experiences) for context. Guide the recruiter to also consider relevant, substantiated information shared by the candidate that may not be on the resume.
    *   Set of criteria must provide broad yet deeply contextual basis for evaluation, **usable by someone not expert in the role's domain**. Weights sum to 1.0. Example: 'Criterion: Technical Communication - Clarity on [specific concept from JD or Unstop/Resume, and other relevant technical points discussed]. Weight: 0.25.'

Return JSON object per output schema. Populate all fields. Goal: logically sequenced kit, relevant tailored questions (from Unstop profile/resume text [treated as full text from PDF/DOC]: projects, tech stack, goals, accomplishments, challenges, education, past experiences), concise judgeable model answers (recruiter's perspective, key points, "Tell me about yourself" model answer tailored from Unstop/resume to help a non-technical recruiter assess candidate's intro against their profile), contextual well-defined rubric for non-technical recruiters that accounts for emergent candidate information.
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
          question: q.question || "Missing question text. AI should generate this, derived from JD/Unstop Profile/Resume Text.",
          answer: q.answer || "Missing model answer. AI should provide guidance from an interviewer's perspective on key points the candidate should cover, informed by JD/Unstop Profile/Resume Text/context (including how to evaluate relevant details not on resume), making it easy for a non-technical recruiter to judge. For 'Tell me about yourself', it should guide on what a candidate with this specific Unstop/Resume background should cover to help a non-technical recruiter assess relevance.",
          type: q.type || "Behavioral",
          category: q.category || (q.type === 'Technical' ? 'Technical' : 'Non-Technical'),
          difficulty: q.difficulty || "Intermediate",
          estimatedTimeMinutes: q.estimatedTimeMinutes || (difficultyTimeMap[q.difficulty || "Intermediate"]),
        })),
      })),
      scoringRubric: (output.scoringRubric || []).map(crit => ({
        criterion: crit.criterion || "Unnamed Criterion (must be well-defined, distinct, high-quality, actionable, measurable, contextually reference JD/Unstop Profile/Resume Text and account for emergent relevant details for comprehensive evaluation by a non-technical recruiter, and be usable by someone not expert in the role's domain). AI should refine this.",
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
        if (lastCrit.weight < 0) { // Should not happen with Math.max(0, ...) but as a safeguard
            lastCrit.weight = 0;
             // Attempt to re-distribute remaining weight if last item became 0 and total is still not 1
            let currentTotal = validatedOutput.scoringRubric.reduce((s,c) => s + c.weight, 0);
            if (Math.abs(currentTotal - 1.0) > 0.001 && validatedOutput.scoringRubric.length > 1) {
                 const remainingDiff = parseFloat((1.0 - currentTotal).toFixed(2));
                 let targetCrit = validatedOutput.scoringRubric.find(c => c !== lastCrit && c.weight > 0) || validatedOutput.scoringRubric.find(c => c !== lastCrit); // find a criterion to adjust
                 if(targetCrit) {
                    targetCrit.weight = parseFloat(Math.max(0, targetCrit.weight + remainingDiff).toFixed(2));
                 }  else if (validatedOutput.scoringRubric.length > 0){
                    validatedOutput.scoringRubric[0].weight = 1.0; // Fallback: assign all to first if others are zero
                 }
            }
        }
        // Final check to assign any tiny rounding errors to the largest weighted item or first item
        finalSum = validatedOutput.scoringRubric.reduce((sum, crit) => sum + crit.weight, 0);
        if (Math.abs(finalSum - 1.0) > 0.001 && validatedOutput.scoringRubric.length > 0) {
            const finalDiffToAdjust = parseFloat((1.0-finalSum).toFixed(2));
            let targetCrit = validatedOutput.scoringRubric.reduce((prev, current) => (prev.weight > current.weight) ? prev : current, validatedOutput.scoringRubric[0]);
            targetCrit.weight = parseFloat(Math.max(0, targetCrit.weight + finalDiffToAdjust).toFixed(2));
        }
    }
    return validatedOutput;
  }
);

    