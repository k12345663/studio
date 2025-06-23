
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
    .describe('The job description to generate an interview kit for. This is a primary source material. AI should try to parse meaningful requirements even if it contains HTML/markup or promotional fluff, focusing on core skills and responsibilities.'),
  unstopProfileLink: z.string().optional().describe("The candidate's Unstop profile link. This is a primary source material if provided; AI should (conceptually) treat this as if accessing and deeply analyzing the candidate's entire live profile for skills, projects, experience, education, academic achievements. THIS IS A COMPULSORY INPUT from the user."),
  candidateResumeDataUri: z.string().optional().describe("A data URI (e.g., 'data:application/pdf;base64,...') of the candidate's resume file (PDF or DOCX). If provided, AI should directly analyze the content of this file (skills, projects, tech stack, goals, accomplishments, challenges, education, academic achievements, past work experiences)."),
  candidateResumeFileName: z.string().optional().describe("The original file name of the candidate's resume (e.g., 'resume.pdf'). For AI context if resume is provided."),
  candidateExperienceContext: z.string().optional().describe('Optional brief context about the target candidate’s experience level, current role, or past tech stack. E.g., "Junior developer, 1-2 years exp, proficient in React" or "Senior architect, 10+ years, extensive AWS and microservices experience." This supplements primary data sources.'),
});
export type GenerateInterviewKitInput = z.infer<typeof GenerateInterviewKitInputSchema>;

const QuestionAnswerPairSchema = z.object({
  question: z.string().describe('The interview question. Should be insightful and highly specific, directly derived from or probing into experiences, skills, projects (including their tech stack, goals, accomplishments, challenges), educational background, academic achievements, and past work experiences, and claims made in the Candidate\'s Unstop Profile (compulsory input, conceptually treat as if analyzing the live profile) and/or the content of the provided Resume File (optional input, AI will analyze its content directly if provided via data URI), the Job Description, as well as any Candidate Experience Context. This includes potentially asking "Tell me about yourself".'),
  answer: z.string().describe("A model answer FOR THE INTERVIEWER'S USE, presented as a few concise bullet points. Each bullet point must suggest an indicative contribution to the question's 10-point score (e.g., 'approx. 2-3 points'). These points are a rapid mental checklist for a non-technical recruiter. Most importantly, the guidance must state that if a candidate provides practical, relevant, or original examples not listed, it should be seen as a strong positive sign of depth. The goal is to assess understanding, not just check off points."),
  type: z.enum(['Technical', 'Scenario', 'Behavioral']).describe('The type of question. Technical for skills/tools, Scenario for problem-solving, Behavioral for past actions (STAR method).'),
  category: z.enum(['Technical', 'Non-Technical']).describe("The category of the question. 'Technical' for questions assessing specific hard skills or tool knowledge. 'Non-Technical' for questions assessing problem-solving, behavioral traits, scenarios, or soft skills (like 'Tell me about yourself'). Infer this primarily from the question type and content."),
  difficulty: z.enum(['Naive', 'Beginner', 'Intermediate', 'Expert', 'Master']).describe("The difficulty level of the question, on a 5-point scale: 'Naive', 'Beginner', 'Intermediate', 'Expert', 'Master'. Assign based on JD requirements and candidate's apparent skill level from Unstop profile/resume file content."),
  estimatedTimeMinutes: z.number().describe('Suitable estimated time in minutes a candidate might need for a thorough answer, considering question complexity and experience level. Default suggestions: Naive(2), Beginner(4), Intermediate(6), Expert(8), Master(10).'),
});

const CompetencySchema = z.object({
  name: z.string().describe('The name of the competency, derived from the job description and potentially informed by Unstop profile/resume file specifics (including educational background and academic achievements). One competency might be "Candidate Introduction & Background" or similar to house introductory questions. Ensure competencies also cover core technical skills from the JD like "Object-Oriented Programming".'),
  importance: z.enum(['High', 'Medium', 'Low']).describe('The importance of this competency for the role, based on the job description.'),
  questions: z.array(QuestionAnswerPairSchema).describe('The questions for the competency. Questions should be generated in a logical sequence: introductory questions first (like "Tell me about yourself", academic background, general experience), then project-specific questions (derived from Unstop profile/resume file content [AI to analyze if provided]), followed by other technical/scenario/behavioral questions that test both candidate-specific details and core JD requirements.'),
});

const ScoringCriterionSchema = z.object({
  criterion: z.string().describe("A well-defined, distinct, and high-quality scoring criterion for a non-technical recruiter to use. It must be actionable, measurable, and directly relevant to assessing candidate suitability. Focus on parameters like 'Clarity of Explanation', 'Relevance of Answer to Question', 'Depth of Understanding (as evidenced by examples or detail, including relevant experiences shared during the interview that may not be on the resume)', 'Problem-Solving Approach', 'Communication Skills'. Each criterion MUST explicitly mention key phrases, skills, concepts, project types, or relevant academic achievements from the Job Description AND/OR the Candidate's Unstop Profile/Resume File Content (AI to analyze if provided, including specific project details, educational background, academic achievements, and past work experiences) where appropriate to make it contextual. The set of criteria MUST provide a broad yet deeply contextual basis for comprehensive candidate evaluation, understandable by someone not expert in the role's domain."),
  weight: z.number().describe('The weight of this criterion (a value between 0.0 and 1.0). All criterion weights in the rubric must sum to 1.0.'),
});

const GenerateInterviewKitOutputSchema = z.object({
  competencies: z.array(CompetencySchema).describe('An array of 4-6 core competencies for the job. The first competency should ideally cover "Candidate Introduction & Background" including "Tell me about yourself", academic background, and general experience questions. Subsequent competencies should cover skills/projects (from Unstop profile/resume file content [AI to analyze if provided]) AND fundamental requirements from the JD (like OOP). Questions should be sequenced logically. Competencies themselves should be informed by the holistic analysis of JD and candidate profile (Unstop link/resume file content, including educational background and academic achievements).'),
  scoringRubric: z
    .array(ScoringCriterionSchema)
    .describe("The 3-5 weighted scoring rubric criteria for the interview. Criteria MUST be contextually derived, well-defined, distinct, high-quality, actionable, measurable, and explicitly referencing key phrases from the Job Description AND/OR Candidate's Unstop Profile/Resume File Content (AI to analyze if provided, including specific project details, educational background, academic achievements, and past work experiences, and guiding the interviewer to also consider relevant information shared by the candidate that may not be on the resume) to provide a broad yet deeply contextual basis for comprehensive candidate evaluation. Frame criteria to be easily usable by a non-technical recruiter, focusing on aspects like clarity, relevance, and depth. For example: 'Criterion: Technical Communication Clarity. Weight: 0.3. (Assesses how clearly the candidate explains technical concepts from the JD or mentioned in their Unstop profile/resume file, and any other relevant technical details they discuss.)'"),
});
export type GenerateInterviewKitOutput = z.infer<typeof GenerateInterviewKitOutputSchema>;

export async function generateInterviewKit(input: GenerateInterviewKitInput): Promise<GenerateInterviewKitOutput> {
  return generateInterviewKitFlow(input);
}

const generateInterviewKitPrompt = ai.definePrompt({
  name: 'generateInterviewKitPrompt',
  input: {schema: GenerateInterviewKitInputSchema},
  output: {schema: GenerateInterviewKitOutputSchema},
  prompt: `You are a highly experienced AI interview evaluator with 25 years of experience, acting as a supportive **recruiter companion**. Your primary goal is to create interview kits that empower recruiters, **especially those who may not be technical experts in the role's domain**, to conduct effective and insightful interviews.

**Your Core Evaluation Process:**

CRITICAL: Before generating any content, you must perform a holistic analysis of ALL available information.

1.  **Detect Role Alignment and Career Transitions:**
    *   First, parse the Job Description to identify the target role and its core skill requirements.
    *   Next, analyze the candidate's profile (Unstop Profile and Resume content, if provided).
    *   **Crucially, compare the candidate's documented skills and experience against the target role's requirements.** If you detect a significant mismatch that suggests a **career transition** (e.g., a candidate with a Software Engineering background applying for a Sales Manager role, corresponding to test cases like \`TC-CAREER-TRAN-01\`, \`TC-CAREER-TRAN-02\`, \`TC-STUDE-PROJ-061\`), you MUST adapt your entire questioning strategy.

2.  **Generate Questions Based on Findings:**
    *   **If a Career Transition is Detected:** Your questions must probe the justification for this shift. The questions MUST challenge the candidate to build the bridge themselves.
        *   Generate questions like: "What motivates your transition from [Candidate's Past Domain] to [Target Role Domain]?", "Which of your past experiences in [Candidate's Past Domain] do you believe are most transferable to this role, and why?", and "What specific steps have you taken to learn about [Target Role Domain] (e.g., certifications, mentorship, practical projects)?"
        *   Generate scenario questions relevant to the *new* domain to test their learning and thought process.
    *   **If No Transition (Standard Role Alignment):** Proceed with the standard real interview pattern: introductory questions, deep-dives into resume/profile projects to validate experience, and questions testing core JD skills.

3.  **Handle Non-Disclosure Cases & Ambiguity:**
    *   If a candidate describes relevant skills and experiences without explicitly stating their previous role title (like in \`TC-CAREER-NDA-04\`), **do not penalize this.** Your evaluation, and the guidance you provide in model answers, must focus on the *substance and relevance* of the described tasks and learnings, not the title itself.
    *   If inputs are vague or unparseable (e.g., cases like \`TC-JDMIS-025\`, \`TC-RESUN-098\`), generate broader, more fundamental questions and note in the model answers that the interviewer may need to probe for more detail.

**Model Answer & Rubric Philosophy:**

Your generated guidance for the interviewer must be practical, generalized, and flexible.

*   **Model Answers are Generalized Evaluation Guides, Not Rigid Scripts:**
    *   Your generated model answers are for the INTERVIEWER'S EYES ONLY. They must be brief, high-level guides.
    *   The bullet points should represent GENERALIZED principles, core concepts, or key thought processes to listen for. They are not a verbatim checklist.
    *   **Indicative Scoring:** Each bullet point in the model answer must have an indicative point value (e.g., '(~3 points)'). This provides a loose framework for scoring, but is not a rigid calculation. The total of these indicative points should logically sum to 10 for each question.
    *   **CRITICAL: Note for Interviewer:** Every model answer must also guide the interviewer that if a candidate provides a different, but highly relevant and practical answer from their own experience, it should be viewed as a **significant PLUS** and can be awarded points, even if it's not one of the checklist items. The goal is to evaluate real-world problem-solving, not rote memorization.
*   **"Tell me about yourself" (Exception):** The model answer for this MUST be a descriptive guide FOR THE INTERVIEWER, framed to help a non-technical recruiter assess relevance by pulling specific details from the candidate's profile (e.g., '*Candidate should connect their project on X to our need for Y...*', '*Should highlight achievement Z as evidence of their drive...*').
*   **Scoring Rubric:** The rubric criteria you generate must also be flexible, focusing on assessing clarity, relevance, problem-solving, and the ability to connect past experience (or learning) to the target role's requirements, including accounting for emergent information shared by the candidate.

Job Description (Primary Source):
{{{jobDescription}}}

Unstop Profile Link (Primary Source - COMPULSORY, **conceptually treat as if accessing and deeply analyzing the live profile**):
{{{unstopProfileLink}}}

{{#if candidateResumeDataUri}}
Candidate Resume File ({{{candidateResumeFileName}}}):
{{media url=candidateResumeDataUri}}
(AI: The candidate's resume is provided above via a data URI. Please directly analyze its content.)
{{else}}
No candidate resume file was provided.
{{/if}}

{{#if candidateExperienceContext}}
Candidate Experience Context (additional notes):
{{{candidateExperienceContext}}}
{{/if}}

Based on a holistic understanding of ALL available information, generate the interview kit following a REAL INTERVIEW PATTERN. Adhere to all the principles described above. Structure the competencies and questions logically, provide insightful and flexible model answers, and create a practical, context-aware scoring rubric. The final kit must be a comprehensive and effective tool for a recruiter, especially one who is not a domain expert.`,
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
          question: q.question || "Missing question text. AI should generate this, derived from JD/Unstop Profile/Resume File Content.",
          answer: q.answer || "Missing model answer. AI should provide guidance from an interviewer's perspective on a few brief keywords/short phrases the candidate should cover, informed by JD/Unstop Profile/Resume File Content/context (including how to evaluate relevant, original details not on resume), making it easy for a non-technical recruiter to judge. For 'Tell me about yourself', it should guide on what a candidate with this specific Unstop/Resume background should cover.",
          type: q.type || "Behavioral",
          category: q.category || (q.type === 'Technical' ? 'Technical' : 'Non-Technical'),
          difficulty: q.difficulty || "Intermediate",
          estimatedTimeMinutes: q.estimatedTimeMinutes || (difficultyTimeMap[q.difficulty || "Intermediate"]),
        })),
      })),
      scoringRubric: (output.scoringRubric || []).map(crit => ({
        criterion: crit.criterion || "Unnamed Criterion (must be well-defined, distinct, high-quality, actionable, measurable, contextually reference JD/Unstop Profile/Resume File Content and account for emergent relevant details for comprehensive evaluation by a non-technical recruiter). AI should refine this.",
        weight: typeof crit.weight === 'number' ? Math.max(0, Math.min(1, crit.weight)) : 0.2,
      })),
    };
     // Ensure rubric weights sum to 1.0
    let totalWeight = validatedOutput.scoringRubric.reduce((sum, crit) => sum + crit.weight, 0);
    if (validatedOutput.scoringRubric.length > 0) {
        if (totalWeight === 0 && validatedOutput.scoringRubric.length > 0) {
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
             totalWeight = validatedOutput.scoringRubric.reduce((s, c) => s + c.weight, 0); // Recalculate
        }
        if (Math.abs(totalWeight - 1.0) > 0.001) { // Allow for small floating point inaccuracies
            const factor = 1.0 / totalWeight;
            let sumOfNormalizedWeights = 0;
            validatedOutput.scoringRubric.forEach((crit, index, arr) => {
                if (index < arr.length -1) {
                    const normalized = Math.max(0, crit.weight * factor); // Ensure not negative before rounding
                    crit.weight = parseFloat(normalized.toFixed(2));
                    sumOfNormalizedWeights += crit.weight;
                } else {
                     // Last element gets the remainder to ensure sum is 1.0
                    crit.weight = parseFloat(Math.max(0, (1.0 - sumOfNormalizedWeights)).toFixed(2));
                }
            });
            // Final check because rounding can still cause slight deviations
            totalWeight = validatedOutput.scoringRubric.reduce((s, c) => s + c.weight, 0);
            if (Math.abs(totalWeight - 1.0) > 0.001 && validatedOutput.scoringRubric.length > 0) {
                const diff = 1.0 - totalWeight;
                const lastCritWeight = validatedOutput.scoringRubric[validatedOutput.scoringRubric.length -1].weight;
                validatedOutput.scoringRubric[validatedOutput.scoringRubric.length -1].weight = 
                    parseFloat(Math.max(0, lastCritWeight + diff).toFixed(2));
            }
        }
    }

    // Ensure no individual weight is negative after all adjustments and that the sum is truly 1.0
    // And handle the case where all weights became zero due to aggressive rounding or tiny initial values
    let finalSum = validatedOutput.scoringRubric.reduce((sum, crit) => {
        crit.weight = Math.max(0, crit.weight); // Ensure no negative weights
        return sum + crit.weight;
    },0);
    

    if (validatedOutput.scoringRubric.length > 0 && Math.abs(finalSum - 1.0) > 0.001) {
        // If sum is zero but items exist, distribute equally.
        if (finalSum === 0) {
            const equalWeight = parseFloat((1.0 / validatedOutput.scoringRubric.length).toFixed(2));
            let currentSum = 0;
            validatedOutput.scoringRubric.forEach((crit, index, arr) => {
                 if(index < arr.length -1) {
                    crit.weight = equalWeight;
                    currentSum += equalWeight;
                } else { // Last element takes remainder
                    crit.weight = parseFloat(Math.max(0,(1.0 - currentSum)).toFixed(2));
                }
            });
        } else { // If sum is not 1.0 and not 0, redistribute proportionally
            const scaleFactor = 1.0 / finalSum;
            let cumulativeWeight = 0;
            for (let i = 0; i < validatedOutput.scoringRubric.length - 1; i++) {
                const normalized = (validatedOutput.scoringRubric[i].weight * scaleFactor);
                validatedOutput.scoringRubric[i].weight = parseFloat(normalized.toFixed(2));
                cumulativeWeight += validatedOutput.scoringRubric[i].weight;
            }
             // Last element takes the remainder to ensure sum is exactly 1.0
            const lastWeight = 1.0 - cumulativeWeight;
            if (validatedOutput.scoringRubric.length > 0) {
              validatedOutput.scoringRubric[validatedOutput.scoringRubric.length - 1].weight = parseFloat(Math.max(0, lastWeight).toFixed(2));
            }
        }
    }
    // Final pass to ensure the last element adjustment for sum to 1.0 didn't make other weights sum > 1
    // This typically occurs if all weights were tiny and normalized to 0.00, then the last one got 1.00
    if (validatedOutput.scoringRubric.length > 1) {
        let checkSum = 0;
        validatedOutput.scoringRubric.forEach(c => checkSum += c.weight);
        if (Math.abs(checkSum - 1.0) > 0.001) { // If still off, likely due to rounding small numbers
           const lastIdx = validatedOutput.scoringRubric.length - 1;
           let sumExceptLast = 0;
           for(let i=0; i < lastIdx; i++) {
               sumExceptLast += validatedOutput.scoringRubric[i].weight;
           }
           validatedOutput.scoringRubric[lastIdx].weight = parseFloat(Math.max(0, 1.0 - sumExceptLast).toFixed(2));
        }
    } else if (validatedOutput.scoringRubric.length === 1) {
        validatedOutput.scoringRubric[0].weight = 1.0; // If only one criterion, it must be 1.0
    }


    return validatedOutput;
  }
);
    
