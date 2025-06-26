
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
  candidateResumeDataUri: z.string().optional().describe("A data URI (e.g., 'data:application/pdf;base64,...') of the candidate's resume file (PDF or DOCX). If provided, AI should directly analyze the content of this file (skills, projects, tech stack, goals, accomplishments, challenges, education, academic achievements, past work experiences)."),
  candidateResumeFileName: z.string().optional().describe("The original file name of the candidate's resume (e.g., 'resume.pdf'). For AI context if resume is provided."),
  candidateExperienceContext: z.string().optional().describe('Optional brief context about the target candidate’s experience level, current role, or past tech stack. E.g., "Junior developer, 1-2 years exp, proficient in React" or "Senior architect, 10+ years, extensive AWS and microservices experience." This supplements primary data sources.'),
});
export type GenerateInterviewKitInput = z.infer<typeof GenerateInterviewKitInputSchema>;

const QuestionAnswerPairSchema = z.object({
  question: z.string().describe('The interview question text only. **Do not add any prefix like "Question 1:" or "1."**. The question should be insightful and highly specific, directly derived from or probing into experiences, skills, projects (including their tech stack, goals, accomplishments, challenges), educational background, academic achievements, and past work experiences, and claims made in the Candidate\'s Unstop Profile Details and/or the content of the provided Resume File (optional input, AI will analyze its content directly if provided via data URI), the Job Description, as well as any Candidate Experience Context. This includes potentially asking "Tell me about yourself".'),
  answer: z.string().describe("A model answer FOR THE INTERVIEWER'S USE. **CRITICAL: Format this as 3-4 concise bullet points, not a paragraph.** Each bullet point must suggest an indicative contribution to the question's 10-point score (e.g., 'approx. 2-3 points'). These points are a rapid mental checklist for a non-technical recruiter. **Every model answer must include a 'Note for Interviewer' section** that explains how to evaluate partial answers and explicitly states that if a candidate provides practical, relevant, or original examples not listed, it should be seen as a strong positive sign of depth. The goal is to assess understanding, not just check off points."),
  type: z.enum(['Technical', 'Scenario', 'Behavioral']).describe('The type of question. Technical for skills/tools, Scenario for problem-solving, Behavioral for past actions (STAR method).'),
  category: z.enum(['Technical', 'Non-Technical']).describe("The category of the question. 'Technical' for questions assessing specific hard skills or tool knowledge. 'Non-Technical' for questions assessing problem-solving, behavioral traits, scenarios, or soft skills (like 'Tell me about yourself'). Infer this primarily from the question type and content."),
  difficulty: z.enum(['Naive', 'Beginner', 'Intermediate', 'Expert', 'Master']).describe("The difficulty level of the question, on a 5-point scale: 'Naive', 'Beginner', 'Intermediate', 'Expert', 'Master'. Assign based on JD requirements and candidate's apparent skill level from Unstop profile details/resume file content."),
  estimatedTimeMinutes: z.number().describe('Suitable estimated time in minutes a candidate might need for a thorough answer, considering question complexity and experience level. Default suggestions: Naive(2), Beginner(4), Intermediate(6), Expert(8), Master(10).'),
});

const CompetencySchema = z.object({
  name: z.string().describe('The name of the competency, derived from the job description and potentially informed by Unstop profile details/resume file specifics (including educational background and academic achievements). One competency might be "Candidate Introduction & Background" or similar to house introductory questions. Ensure competencies also cover core technical skills from the JD like "Object-Oriented Programming".'),
  importance: z.enum(['High', 'Medium', 'Low']).describe('The importance of this competency for the role, based on the job description.'),
  questions: z.array(QuestionAnswerPairSchema).describe('The questions for the competency. Questions should be generated in a logical sequence: introductory questions first (like "Tell me about yourself", academic background, general experience), then project-specific questions (derived from Unstop profile details/resume file content [AI to analyze if provided]), followed by other technical/scenario/behavioral questions that test both candidate-specific details and core JD requirements.'),
});

const ScoringCriterionSchema = z.object({
  criterion: z.string().describe("A well-defined, distinct, and high-quality scoring criterion for a non-technical recruiter to use. It must be actionable, measurable, and directly relevant to assessing candidate suitability. Focus on parameters like 'Clarity of Explanation', 'Relevance of Answer to Question', 'Depth of Understanding (as evidenced by examples or detail, including relevant experiences shared during the interview that may not be on the resume)', 'Problem-Solving Approach', 'Communication Skills'. Each criterion MUST explicitly mention key phrases, skills, concepts, project types, or relevant academic achievements from the Job Description AND/OR the Candidate's Unstop Profile Details/Resume File Content (AI to analyze if provided, including specific project details, educational background, academic achievements, and past work experiences) where appropriate to make it contextual. The set of criteria MUST provide a broad yet deeply contextual basis for comprehensive candidate evaluation, understandable by someone not expert in the role's domain."),
  weight: z.number().describe('The weight of this criterion (a value between 0.0 and 1.0). All criterion weights in the rubric must sum to 1.0.'),
});

const GenerateInterviewKitOutputSchema = z.object({
  competencies: z.array(CompetencySchema).describe('An array of 4-6 core competencies for the job. The first competency should ideally cover "Candidate Introduction & Background" including "Tell me about yourself", academic background, and general experience questions. Subsequent competencies should cover skills/projects (from Unstop profile details/resume file content [AI to analyze if provided]) AND fundamental requirements from the JD (like OOP). Questions should be sequenced logically. Competencies themselves should be informed by the holistic analysis of JD and candidate profile (Unstop details/resume file content, including educational background and academic achievements).'),
  scoringRubric: z
    .array(ScoringCriterionSchema)
    .describe("The 3-5 weighted scoring rubric criteria for the interview. Criteria MUST be contextually derived, well-defined, distinct, high-quality, actionable, measurable, and explicitly referencing key phrases from the Job Description AND/OR Candidate's Unstop Profile Details/Resume File Content (AI to analyze if provided, including specific project details, educational background, academic achievements, and past work experiences, and guiding the interviewer to also consider relevant information shared by the candidate that may not be on the resume) to provide a broad yet deeply contextual basis for comprehensive candidate evaluation. Frame criteria to be easily usable by a non-technical recruiter, focusing on aspects like clarity, relevance, and depth. For example: 'Criterion: Technical Communication Clarity. Weight: 0.3. (Assesses how clearly the candidate explains technical concepts from the JD or mentioned in their Unstop profile/resume file, and any other technical details they discuss.)'"),
});
export type GenerateInterviewKitOutput = z.infer<typeof GenerateInterviewKitOutputSchema>;

export async function generateInterviewKit(input: GenerateInterviewKitInput): Promise<GenerateInterviewKitOutput> {
  return generateInterviewKitFlow(input);
}

const generateInterviewKitPrompt = ai.definePrompt({
  name: 'generateInterviewKitPrompt',
  input: {schema: GenerateInterviewKitInputSchema},
  output: {schema: GenerateInterviewKitOutputSchema},
  prompt: `You are "Recruiter Copilot," an expert AI assistant for talent acquisition professionals. Your primary function is to perform a meticulous, word-by-word deep analysis of a candidate's profile (from a resume file and pasted Unstop details) and a job description (JD) to generate a strategic, insightful, and conversational interview kit. Your goal is to move beyond simple keyword matching and act as a true strategic partner. Every single question you generate must be a direct and logical consequence of this analysis, connecting a specific detail, skill, or experience from the candidate's profile to a stated or implied requirement in the job description, and addressing the nuanced scenarios found in your Knowledge Base.

**Your Core Evaluation Process: A Multi-Stage Deep Analysis**

**Stage 1: Input Quality and Integrity Check & Deep Analysis**
First, deeply analyze every word of the provided Job Description, Unstop Profile Details, and Resume for completeness, clarity, and potential issues. This is a word-by-word analysis. If inputs are missing or poor quality, generate broader questions and flag the issue in your internal analysis.

**Stage 2: Candidate-Role Profile Matching & Scenario Identification**
CRITICAL: Silently synthesize all information to identify the primary scenario(s) that best describe the candidate's situation relative to the role. This is your most important analytical step. Use the comprehensive Knowledge Base below to classify the situation. Do not mention the detected scenario in your output. If multiple scenarios are detected, prioritize the most critical one.

**Stage 3: Generate Questions with a Standard Interview Funnel Sequence**
Your generated kit MUST follow a logical, real-world interview sequence, adapted to the scenario you identified. The sequence is critical for a natural conversation flow. Place questions into competencies accordingly.
*   **Step 1: Introduction.** The first question in the entire kit MUST be "Tell me about yourself." It should be in a competency like "Candidate Introduction & Background".
*   **Step 2: Motivation & Alignment.** Immediately after the introduction, you MUST generate questions that professionally and conversationally address the primary scenario identified in Stage 2. (e.g., For an overqualified candidate, ask "Your experience is impressive. This role is a hands-on contributor position. Could you share what aspects of being 'in the weeds' again are appealing to you at this stage of your career?").
*   **Step 3: Experience Deep Dive.** Following the alignment questions, generate questions that are deep dives into their most relevant projects and work experiences from their profile.
*   **Step 4: Broader Skill Assessment.** Conclude with more general technical, scenario, or behavioral questions that test core skills from the Job Description. **Crucially, if the JD specifies an industry (e.g., Fintech, Healthcare, E-commerce), some of these questions must probe the candidate's domain-specific knowledge, for instance, about regulations, key metrics, or user behavior specific to that industry.**

**Stage 4: Model Answer & Rubric Philosophy**
Your generated guidance for the interviewer must be practical, generalized, and flexible, and aligned with the detected scenario.
*   **Model Answers:** These are generalized evaluation guides for the INTERVIEWER'S EYES ONLY.
    *   **Format:** 3-4 concise bullet points. AVOID long sentences or paragraphs.
    *   **Indicative Scoring:** Each bullet point must have a suggested point value (e.g., '(~3 points)') that logically sums to 10.
    *   **Note for Interviewer (MANDATORY):** Every model answer must end with a "Note for Interviewer". This note should guide on scoring partial answers and explicitly state that if a candidate provides a different but highly relevant, practical answer from their own experience, it should be viewed as a **significant PLUS**.
*   **"Tell me about yourself" (Unique Instruction):** This model answer MUST also be a set of bullet points for the interviewer, guiding them on what to listen for in a compelling narrative, rather than summarizing the candidate's resume.
*   **Scoring Rubric:** Rubric criteria must be flexible and context-aware, focusing on assessing clarity, relevance, problem-solving, and adaptability.

**Knowledge Base: Recruiter Scenarios & Corresponding Actions**
--- A. Candidate Experience & Profile Nuances ---
- **Fewer Years but Strong Project Leadership:** JD wants X+ years, resume shows <X years but has "Lead" or "Managed" on a significant project. -> Deprioritize "years." Ask questions to quantify the scope (team size, budget), impact (KPIs), and leadership challenges.
- **Related Tech (e.g., AWS vs Azure):** JD requires tech stack A, resume shows deep experience in comparable stack B. -> Probe for transferable skills and learning agility. Ask how they would map their knowledge to the new stack.
- **Overqualified Candidate:** Resume shows senior titles ("Director") applying for a junior role. -> Probe motivation for the "step down." Ask about their excitement for hands-on work and comfort with taking direction.
- **Gaps in Employment:** Unexplained employment gap of 6+ months. -> Address the gap neutrally. Ask how they utilized the time and if they engaged in skill development.
- **Non-Traditional Background (e.g., Physics to Data Science):** Degree is in a different but analytically related field. -> Ask them to bridge the gap. Probe for transferable analytical skills and how they've applied them to practical problems.
- **Lack of Specific Industry Experience (e.g., Gaming to Fintech):** Strong tech experience in Industry A applying for Industry B. -> Assess motivation and learning approach. Ask what they've done to learn the new domain.
- **Frequent Job Switching:** 3+ jobs in the last 2-3 years. -> Ask for the story behind the transitions and what they seek for long-term commitment.
- **Shifting to a Related but Different Role (e.g., Backend to DevOps):** Clear career pivot. -> Validate the motivation. Ask what proactive, hands-on steps they've taken to learn the new role's core skills.
- **Career Break with Upskilling:** Resume explicitly states a career break for learning. -> Probe the depth and discipline of their learning. Ask about a project built from scratch.
- **Internship-Heavy Profile for Full-Time Role:** Multiple internships but no full-time experience. -> Examine scope and ownership in internships. Ask them to describe a project they personally owned.
- **Potentially Exaggerated Claims (e.g., "Kafka Expert"):** Use of strong keywords ("Expert") without extensive supporting detail. -> Respectfully pressure-test the claim with deeper architectural or troubleshooting questions.
- **Ambiguous Role Titles (e.g., "Tech Specialist"):** Vague job titles. -> Seek to clarify their day-to-day. Ask for a percentage breakdown of their time (coding vs. configuration vs. support).
- **Lists "Team Projects" Only:** Accomplishments attributed to "the team". -> Isolate their personal contribution. Ask "What was your specific role?"
- **Freelancer Applying for Full-Time Role:** Recent experience is "Freelance." -> Test their mindset shift. Probe their readiness for team collaboration and shared code ownership.

--- B. JD & Profile Mismatches ---
- **Generic JD, Specific Profile:** JD is vague, but resume is highly specific. -> Use the candidate's specific skills to add depth to the vague JD.
- **Detailed JD, Vague Profile:** JD lists 15+ requirements, resume is a 1-liner. -> Ask broad questions first, then zero in on the top 2-3 most critical skills from the JD.
- **Significant Experience Gap (Senior vs. Junior):** JD wants 8+ years, resume shows 2. -> Acknowledge the gap transparently. State you're looking for exceptional talent and will ask deeper fundamental questions. This is a qualification call.
- **Total Tech Stack Mismatch:** JD requires stack A, resume has stack B. -> Focus entirely on transferability and learning curve.

--- C. Profile Quality & Content Issues ---
- **Profile Full of Buzzwords:** Jargon without concrete examples. -> Challenge the vague claims. Ask for a specific project example and real metrics.
- **Profile Lists Outdated Tools:** Use of obsolete technologies. -> Filter for relevance. Ask questions testing their knowledge of the modern equivalent tools.
- **Profile Looks AI-Written:** Generic, formulaic prose. -> Test for authenticity with situational/experiential questions ("Tell me about a time you made a mistake...").
- **Excessively Long Profile:** Over 5-6 pages long. -> Take control and prioritize. State you will focus on their most recent and relevant experience.

--- D. Student & Fresher Profiles ---
- **Final Year Student with One Internship:** -> Focus on internship learnings, not expertise. Ask about specific contributions and challenges.
- **15+ Certs, No Projects:** -> Test if knowledge is purely theoretical. Ask them to describe a project they would build to demonstrate those skills.
- **Research Papers, No Industry Exp:** -> Bridge the academic mindset to industry pace. Ask how they feel about "good enough" solutions.
- **Non-Tech Student for Tech Role:** -> Evaluate motivation and proactive learning. Ask what specific steps they've taken to learn required technical skills.
- **Bootcamp Grad Only:** -> Test for engineering thinking beyond a curriculum. Ask about self-sufficient problem-solving (debugging) and professional practices (Git).
- **Top-Tier Institute with Average Profile:** -> Ignore the brand name. Evaluate purely on the merits of their work, communication, and thinking.

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
(AI: You must perform a word-by-word deep analysis of this resume content.)
{{else}}
No candidate resume file was provided.
{{/if}}

{{#if candidateExperienceContext}}
Candidate Experience Context (additional notes):
{{{candidateExperienceContext}}}
{{/if}}

Based on a holistic, multi-stage, word-by-word deep analysis of ALL available information, generate the interview kit following a REAL INTERVIEW PATTERN. Adhere to all the principles described above. Structure the competencies and questions logically, provide insightful and flexible model answers, and create a practical, context-aware scoring rubric. The final kit must be a comprehensive and effective tool for a recruiter, especially one who is not a domain expert. **Your output must strictly adhere to the provided JSON schema.**`,
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
