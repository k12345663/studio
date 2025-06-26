
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
  unstopProfileLink: z.string().optional().describe("The candidate's Unstop profile link. THIS IS A COMPULSORY INPUT from the user. It is used for context."),
  unstopProfileDetails: z.string().optional().describe("A block of text pasted from the candidate's Unstop profile (e.g., skills, experience, projects). This is a primary source material for direct analysis."),
  candidateResumeDataUri: z.string().optional().describe("A data URI (e.g., 'data:application/pdf;base64,...') of the candidate's resume file (PDF or DOCX). If provided, AI must perform a deep, word-for-word analysis of the content of this file (skills, projects, tech stack, goals, accomplishments, challenges, education, academic achievements, past work experiences). This is a critical primary source."),
  candidateResumeFileName: z.string().optional().describe("The original file name of the candidate's resume (e.g., 'resume.pdf'). For AI context if resume is provided."),
  candidateExperienceContext: z.string().optional().describe('Optional brief context about the target candidate’s experience level, current role, or past tech stack. E.g., "Junior developer, 1-2 years exp, proficient in React" or "Senior architect, 10+ years, extensive AWS and microservices experience." This supplements primary data sources.'),
});
export type GenerateInterviewKitInput = z.infer<typeof GenerateInterviewKitInputSchema>;

const ModelAnswerPointSchema = z.object({
  text: z.string().describe("A single, concise bullet point for the model answer. This is a key talking point the candidate should cover."),
  points: z.number().int().min(0).max(10).describe("The point value for this specific bullet point. The sum of all points for a single question's model answer should ideally equal 10. A 'Note for Interviewer' should have 0 points."),
});

const QuestionAnswerPairSchema = z.object({
  question: z.string().describe('The interview question text only. **Do not add any prefix like "Question 1:" or "1."**. The question must be insightful, conversational, and based on your deep analysis. For example: "I see your experience is in e-commerce; what about the fintech domain interested you?" or "Your resume shows deep experience in AWS, whereas we are primarily an Azure shop. How would you approach that transition?" This includes potentially asking "Tell me about yourself".'),
  modelAnswerPoints: z.array(ModelAnswerPointSchema).min(2).max(5).describe("A model answer FOR THE INTERVIEWER'S USE, broken down into 2-5 specific, checkable points. The total `points` for all items in this array should sum to 10. **Every question must also include one point with the text 'Note for Interviewer: ...'** that explains how to evaluate partial answers and that practical, relevant examples from the candidate are a strong positive sign. This 'Note' should have a point value of 0."),
  type: z.enum(['Technical', 'Scenario', 'Behavioral']).describe('The type of question. Technical for skills/tools, Scenario for problem-solving, Behavioral for past actions (STAR method).'),
  category: z.enum(['Technical', 'Non-Technical']).describe("The category of the question. 'Technical' for questions assessing specific hard skills or tool knowledge. 'Non-Technical' for questions assessing problem-solving, behavioral traits, scenarios, or soft skills (like 'Tell me about yourself'). Infer this primarily from the question type and content."),
  difficulty: z.enum(['Naive', 'Beginner', 'Intermediate', 'Expert', 'Master']).describe("The difficulty level of the question, on a 5-point scale: 'Naive', 'Beginner', 'Intermediate', 'Expert', 'Master'. Assign based on JD requirements and candidate's apparent skill level from Unstop profile details/resume file content."),
  estimatedTimeMinutes: z.number().describe('Suitable estimated time in minutes a candidate might need for a thorough answer, considering question complexity and experience level. Default suggestions: Naive(2), Beginner(4), Intermediate(6), Expert(8), Master(10).'),
});

const CompetencySchema = z.object({
  name: z.string().describe('The name of the competency, derived from your deep analysis of the job description and candidate profile. Examples: "Career Trajectory & Motivation", "Technical Skill Alignment", "Project Impact & Ownership".'),
  importance: z.enum(['High', 'Medium', 'Low']).describe('The importance of this competency for the role, based on the job description.'),
  questions: z.array(QuestionAnswerPairSchema).describe('A rich set of 2-4 questions for the competency. Questions must be generated in a logical sequence and be a direct result of your analysis, probing into specific experiences, skills, projects, and potential alignment gaps.'),
});

const ScoringCriterionSchema = z.object({
  criterion: z.string().describe("A well-defined scoring criterion. It must be actionable, measurable, and directly derived from your analysis. Example: 'Clarity of Explanation on Project X' or 'Demonstrated understanding of the shift from on-prem to cloud architecture'. It should explicitly reference key aspects of the JD or resume like specific projects, skills, or required experiences."),
  weight: z.number().describe('The weight of this criterion (a value between 0.0 and 1.0). All criterion weights in the rubric must sum to 1.0.'),
});

const GenerateInterviewKitOutputSchema = z.object({
  competencies: z.array(CompetencySchema).describe('An array of 4-6 core competencies. The competencies and questions within them must be a direct result of your deep, multi-stage analysis, creating a logical interview funnel that addresses the most critical alignment points first.'),
  scoringRubric: z
    .array(ScoringCriterionSchema)
    .describe("A set of 3-5 weighted scoring rubric criteria. These criteria MUST be a high-level summary of the most critical evaluation areas based on your deep analysis. For example, if you detected a skills gap, a criterion could be 'Assessing Transferable Skills and Learning Agility'. If the candidate is overqualified, a criterion could be 'Evaluating Motivation and Role-Fit Alignment'."),
});
export type GenerateInterviewKitOutput = z.infer<typeof GenerateInterviewKitOutputSchema>;

export async function generateInterviewKit(input: GenerateInterviewKitInput): Promise<GenerateInterviewKitOutput> {
  return generateInterviewKitFlow(input);
}

const generateInterviewKitPrompt = ai.definePrompt({
  name: 'generateInterviewKitPrompt',
  input: {schema: GenerateInterviewKitInputSchema},
  output: {schema: GenerateInterviewKitOutputSchema},
  prompt: `You are "Insight-Pro," an autonomous AI Recruitment Analyst. Your primary function is to perform a deep, inferential, word-for-word analysis of a candidate's profile against a job description. Your goal is to move beyond surface-level matching to autonomously detect key career events, skill gaps, motivation drivers, and potential red flags. You will then generate a highly targeted, rich, and logically structured interview kit based on your findings.

# CORE MANDATE: THE INFERENCE ENGINE
Before generating any output, you MUST silently execute the following analytical steps. This is your core operational logic.

**Step 1: Structured Data Extraction & Deep Analysis**
Internally parse the resume (from the data URI), JD, and any other context. Perform a word-for-word analysis to extract and structure key data points. This includes, but is not limited to: job history, dates, durations, specific responsibilities, projects, skills mentioned, educational background, and required skills/experience from the JD.

**Step 2: Cross-Correlation and Autonomous Discrepancy Detection**
Using the structured data, you MUST perform a deep comparison to silently flag any identified scenarios:
- **Experience Level Mismatch:** Detect Overqualified, Underqualified candidates.
- **Tech Stack Mismatch:** Identify critical missing skills from the JD in the resume, and note transferable alternative skills the candidate possesses.
- **Career Timeline Analysis:** Calculate and flag unexplained Employment Gaps (>6 months) and patterns of Frequent Job Switching.
- **Career Trajectory Analysis:** Identify Domain Transitions (e.g., Healthcare to Fintech), Role Transitions (e.g., QA to DevOps), or significant career pivots.
- **Authenticity and Depth Analysis:** Scan for buzzwords, potentially exaggerated claims, and unclear individual contributions in projects.

# TASK: GENERATE A RICH & DEEP INTERVIEW KIT
Based *only* on the scenarios you autonomously detected and the deep, word-for-word analysis of their specific experiences and projects, generate a comprehensive interview kit. The questions must flow logically, addressing the most significant findings first.

**OUTPUT REQUIREMENT:**
Your output MUST adhere strictly to the provided JSON schema.
- **Competencies:** Generate 4-6 competencies that are directly informed by your analysis. Competency names should be specific to your findings, like 'Bridging the Java-to-Python Tech Stack Gap' or 'Validating Project Leadership Claims'.
- **Questions (Generate More):** For each competency, generate a rich set of 2-4 questions. Every single question MUST be a direct consequence of your deep analysis and explicitly reference a detail from the resume or a requirement from the JD.
    - **Icebreaker & Alignment:** The first competency MUST include "Tell me about yourself" and a direct alignment question like "From your perspective, what about this role seemed like the next logical step in your career?"
    - **Deep Dives on Experience/Projects:** You MUST generate specific, conversational questions that refer directly to projects or roles mentioned in the resume. **Do not be generic.** For example, instead of "Tell me about a technical challenge," ask: "In your 'Phoenix Project' at Acme Corp, you mentioned using microservices. What was the most significant scalability challenge you faced with that architecture, and how did you solve it?"
    - **Probe Transitions & Gaps:** If a career shift or skill gap is detected, you MUST ask about it directly. Example: "I see you have extensive experience with AWS, whereas this role is heavily Azure-based. Can you walk me through your plan for bridging that gap?"
- **Model Answer Points:** Model answers MUST be a structured array of checkable points. **Crucially, these points must be tailored to the question.** For a question about a specific project, the points should guide the interviewer to listen for specific technologies, outcomes, or responsibilities mentioned *in the resume for that project*.
- **Scoring Rubric:** The rubric criteria MUST be a high-level summary of the most critical evaluation areas based on your analysis. **These must be specific and actionable.** Instead of a generic "Technical Skills", a better criterion would be "Demonstrated ability to apply Python skills to a FinTech context (addressing a key JD requirement against a non-FinTech resume)".

**Inputs for Analysis:**

Job Description (Primary Source):
{{{jobDescription}}}

Unstop Profile Link (for context only):
{{{unstopProfileLink}}}

{{#if unstopProfileDetails}}
Unstop Profile Details (Primary Source for Analysis):
{{{unstopProfileDetails}}}
{{/if}}

{{#if candidateResumeDataUri}}
Candidate Resume File ({{{candidateResumeFileName}}}):
{{media url=candidateResumeDataUri}}
(AI: You must perform a word-for-word deep analysis of this resume content, focusing on specific projects, roles, and skills mentioned.)
{{else}}
No candidate resume file was provided.
{{/if}}

{{#if candidateExperienceContext}}
Candidate Experience Context (additional notes):
{{{candidateExperienceContext}}}
{{/if}}

Based on a holistic, multi-stage, word-for-word deep analysis of ALL available information, generate a comprehensive interview kit. The kit must contain 4-6 competencies with a rich set of 2-4 questions each that follow a REAL INTERVIEW PATTERN. Adhere to all the principles described above. The final kit must be a comprehensive and effective tool for a recruiter, especially one who is not a domain expert. **Your output must strictly adhere to the provided JSON schema.**`,
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
          modelAnswerPoints: (q.modelAnswerPoints || [{ text: "Missing model answer points.", points: 0 }]).map(p => ({ text: p.text, points: p.points ?? 0 })),
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
