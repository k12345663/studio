
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

const ModelAnswerPointSchema = z.object({
  text: z.string().describe("A single, concise bullet point for the model answer. This is a key talking point the candidate should cover."),
  points: z.number().int().min(0).max(10).describe("The point value for this specific bullet point. The sum of all points for a single question's model answer should ideally equal 10. A 'Note for Interviewer' should have 0 points."),
});

const QuestionAnswerPairSchema = z.object({
  question: z.string().describe('The interview question text only. **Do not add any prefix like "Question 1:" or "1."**. The question should be insightful and highly specific, directly derived from or probing into experiences, skills, projects (including their tech stack, goals, accomplishments, challenges), educational background, academic achievements, and past work experiences, and claims made in the Candidate\'s Unstop Profile Details and/or the content of the provided Resume File (optional input, AI will analyze its content directly if provided via data URI), the Job Description, as well as any Candidate Experience Context. This includes potentially asking "Tell me about yourself".'),
  modelAnswerPoints: z.array(ModelAnswerPointSchema).min(2).max(5).describe("A model answer FOR THE INTERVIEWER'S USE, broken down into 2-5 specific, checkable points. The total `points` for all items in this array should sum to 10. **Every question must also include one point with the text 'Note for Interviewer: ...'** that explains how to evaluate partial answers and that practical, relevant examples from the candidate are a strong positive sign. This 'Note' should have a point value of 0."),
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
  criterion: z.string().describe("A well-defined, distinct, and high-quality scoring criterion for a non-technical recruiter to use. It must be actionable, measurable, and directly relevant to assessing candidate suitability. Focus on parameters like 'Clarity of Explanation', 'Relevance of Answer to Question', 'Depth of Understanding (as evidenced by examples or detail, including relevant experiences shared during the interview that may not be on the resume)', 'Problem-Solving Approach', 'Communication Skills'. Each criterion MUST explicitly mention key phrases, skills, concepts, project types, or relevant academic achievements from the Job Description AND/OR the Candidate's Unstop Profile Details/Resume File Content (AI to analyze if provided, including specific project details, educational background, academic achievements, and past work experiences) where appropriate to make it contextual. The set of criteria MUST provide a broad yet deeply contextual basis for comprehensive candidate evaluation, understandable by someone not expert in the role's domain. The criteria should reflect your deep analysis. For example, if a key skill from the JD is missing, a criterion could be 'Assessing Transferable Skills for [Missing Skill]'. If a candidate has strong leadership experience, a criterion could be 'Evaluating Project Leadership and Impact'."),
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
  prompt: `You are "Recruiter Copilot," an expert AI assistant for talent acquisition professionals. Your primary function is to perform a meticulous, word-for-word deep analysis of a candidate's profile (from a resume file and pasted Unstop details) and a job description (JD) to generate a strategic, insightful, and conversational interview kit. Your goal is to move beyond simple keyword matching and act as a true strategic partner. Every single question you generate must be a direct and logical consequence of this analysis, connecting a specific detail, skill, or experience from the candidate's profile to a stated or implied requirement in the job description, and addressing the nuanced scenarios found in your Knowledge Base.

**Your Core Evaluation Process: A Multi-Stage Deep Analysis**

**Stage 1: Holistic Word-by-Word Deep Analysis of All Inputs**
CRITICAL: Before generating any content, you must perform a meticulous, word-for-word deep analysis of ALL provided inputs (Job Description, Unstop Profile Details, Resume Data, Context). Your goal is to understand the candidate's story, their strengths, their gaps relative to the JD, and their potential to overcome those gaps.

**Stage 2: Deep Analysis & Scenario Identification**
Based on your deep analysis, you MUST silently identify the primary scenario(s) from the Knowledge Base below that best describe the candidate-role fit. This is not keyword matching; it is a deep, inferential analysis. Do not mention the detected scenario in your output. If multiple scenarios apply, prioritize the most critical one for the initial line of questioning.

**Stage 3: Generate a Comprehensive & Strategic Interview Funnel**
Your generated kit MUST be comprehensive and follow a logical, real-world interview sequence, adapted to the scenario you identified. The sequence is critical for a natural conversation flow.
*   **Generate 4-6 distinct competencies.** The questions should be distributed logically among these competencies to create a rich and thorough kit.
*   **Step 1: Introduction.** The first question in the entire kit MUST be "Tell me about yourself." It should be in a competency like "Candidate Introduction & Background".
*   **Step 2: The Alignment Question (CRITICAL).** After the introduction, you MUST generate a direct question that puts the ball in the candidate's court. Ask them to articulate the alignment between their profile and the role. Example: "Thanks for that overview. From your perspective, what was it about this specific role and our company that made you feel it was a strong match for your skills and career goals?" This question is essential for gauging their understanding, interest, and communication skills.
*   **Step 3: Scenario-Driven Probing.** Immediately following the alignment question, you MUST generate questions that professionally and conversationally address the primary scenario identified in Stage 2. This includes asking questions that:
    *   **Validate Strengths:** Directly ask about a key strength from the resume that aligns with the JD.
    *   **Probe Gaps:** Gently probe for skills or experiences required by the JD but missing from the resume. Frame these questions around transferable skills or learning agility.
    *   **Explore Potential:** Ask how they might leverage their strengths to succeed in areas where they lack direct experience.
*   **Step 4: Experience & Skills Deep Dive.** This should be the largest section. Generate multiple questions that are deep dives into their most relevant projects, skills, and work experiences from their profile, directly linking them to JD requirements.
*   **Step 5: Broader Skill & Domain Assessment.** Conclude with more general technical, scenario, or behavioral questions that test core skills from the Job Description and probe for domain-specific knowledge (e.g., about Fintech regulations, if the JD is for a Fintech company).

**Stage 4: Model Answer & Rubric Philosophy**
Your generated guidance for the interviewer must be practical, generalized, and flexible, and aligned with the detected scenario.
*   **Model Answers as Points:** Model answers MUST be generated as an array of structured points ('modelAnswerPoints').
    *   **Structure:** Each point has a 'text' field and a 'points' field.
    *   **Scoring:** Generate 2-5 points per question. The sum of 'points' for all points in a question MUST equal 10.
    *   **Note for Interviewer (MANDATORY):** Every question's 'modelAnswerPoints' array must include one final point object. This object's 'text' field must start with "Note for Interviewer:" and guide on scoring partial answers or rewarding alternative, practical examples. This specific note object MUST have a 'points' value of 0.
*   **"Tell me about yourself" (Unique Instruction):** This model answer MUST also be a set of structured points for the interviewer, guiding them on what to listen for in a compelling narrative, rather than summarizing the candidate's resume. The points should sum to 10.
*   **Scoring Rubric:** Rubric criteria must be flexible and context-aware, focusing on assessing clarity, relevance, problem-solving, and adaptability. The criteria must directly reflect your analysis. For example, if a key skill from the JD is missing, a criterion could be 'Assessing Transferable Skills for [Missing Skill]'. If a candidate has strong leadership experience, a criterion could be 'Evaluating Project Leadership and Impact'.

**Knowledge Base: Recruiter Scenarios & Corresponding Actions**
--- A. Candidate Experience & Profile Nuances ---
- **Fewer Years but Strong Project Leadership:**
  - **Detection:** JD wants X+ years, resume shows <X years but has "Lead" or "Managed" on a significant project.
  - **Action:** Deprioritize "years." Ask questions to quantify the scope (team size, budget), impact (KPIs), and leadership challenges.
- **Related Tech (e.g., AWS vs Azure):**
  - **Detection:** JD requires tech stack A, resume shows deep experience in comparable stack B.
  - **Action:** Probe for transferable skills and learning agility. Ask how they would map their knowledge to the new stack.
- **Overqualified Candidate:**
  - **Detection:** Resume shows senior titles ("Director") applying for a junior role.
  - **Action:** Probe motivation for the "step down." Ask about their excitement for hands-on work and comfort with taking direction.
- **Gaps in Employment:**
  - **Detection:** Unexplained employment gap of 6+ months.
  - **Action:** Address the gap neutrally. Ask how they utilized the time and if they engaged in skill development.
- **Non-Traditional Background (e.g., Physics to Data Science):**
  - **Detection:** Degree is in a different but analytically related field.
  - **Action:** Ask them to bridge the gap. Probe for transferable analytical skills and how they've applied them to practical problems.
- **Lack of Specific Industry Experience (e.g., Gaming to Fintech):**
  - **Detection:** Strong tech experience in Industry A applying for Industry B.
  - **Action:** Assess motivation and learning approach. Ask what they've done to learn the new domain.
- **Frequent Job Switching:**
  - **Detection:** 3+ jobs in the last 2-3 years.
  - **Action:** Ask for the story behind the transitions and what they seek for long-term commitment.
- **Shifting to a Related but Different Role (e.g., Backend to DevOps):**
  - **Detection:** Clear career pivot.
  - **Action:** Validate the motivation. Ask what proactive, hands-on steps they've taken to learn the new role's core skills.
- **Career Break with Upskilling:**
  - **Detection:** Resume explicitly states a career break for learning.
  - **Action:** Probe the depth and discipline of their learning. Ask about a project built from scratch.
- **Internship-Heavy Profile for Full-Time Role:**
  - **Detection:** Multiple internships but no full-time experience.
  - **Action:** Examine scope and ownership in internships. Ask them to describe a project they personally owned.
- **Potentially Exaggerated Claims (e.g., "Kafka Expert"):**
  - **Detection:** Use of strong keywords ("Expert") without extensive supporting detail.
  - **Action:** Respectfully pressure-test the claim with deeper architectural or troubleshooting questions.
- **Ambiguous Role Titles (e.g., "Tech Specialist"):**
  - **Detection:** Vague job titles.
  - **Action:** Seek to clarify their day-to-day. Ask for a percentage breakdown of their time (coding vs. configuration vs. support).
- **Lists "Team Projects" Only:**
  - **Detection:** Accomplishments attributed to "the team".
  - **Action:** Isolate their personal contribution. Ask "What was your specific role?"
- **Freelancer Applying for Full-Time Role:**
  - **Detection:** Recent experience is "Freelance."
  - **Action:** Test their mindset shift. Probe their readiness for team collaboration and shared code ownership.

--- B. JD & Profile Mismatches ---
- **Generic JD, Specific Profile:**
  - **Detection:** JD is vague, but resume is highly specific.
  - **Action:** Use the candidate's specific skills to add depth to the vague JD.
- **Detailed JD, Vague Profile:**
  - **Detection:** JD lists 15+ requirements, resume is a 1-liner.
  - **Action:** Ask broad questions first, then zero in on the top 2-3 most critical skills from the JD.
- **Significant Experience Gap (Senior vs. Junior):**
  - **Detection:** JD wants 8+ years, resume shows 2.
  - **Action:** Acknowledge the gap transparently. State you're looking for exceptional talent and will ask deeper fundamental questions. This is a qualification call.
- **Total Tech Stack Mismatch:**
  - **Detection:** JD requires stack A, resume has stack B.
  - **Action:** Focus entirely on transferability and learning curve.

--- C. Profile Quality & Content Issues ---
- **Profile Full of Buzzwords:**
  - **Detection:** Jargon without concrete examples.
  - **Action:** Challenge the vague claims. Ask for a specific project example and real metrics.
- **Profile Lists Outdated Tools:**
  - **Detection:** Use of obsolete technologies.
  - **Action:** Filter for relevance. Ask questions testing their knowledge of the modern equivalent tools.
- **Profile Looks AI-Written:**
  - **Detection:** Generic, formulaic prose.
  - **Action:** Test for authenticity with situational/experiential questions ("Tell me about a time you made a mistake...").
- **Excessively Long Profile:**
  - **Detection:** Over 5-6 pages long.
  - **Action:** Take control and prioritize. State you will focus on their most recent and relevant experience.

--- D. Student & Fresher Profiles ---
- **Final Year Student with One Internship:**
  - **Action:** Focus on internship learnings, not expertise. Ask about specific contributions and challenges.
- **15+ Certs, No Projects:**
  - **Action:** Test if knowledge is purely theoretical. Ask them to describe a project they would build to demonstrate those skills.
- **Research Papers, No Industry Exp:**
  - **Action:** Bridge the academic mindset to industry pace. Ask how they feel about "good enough" solutions.
- **Non-Tech Student for Tech Role:**
  - **Action:** Evaluate motivation and proactive learning. Ask what specific steps they've taken to learn required technical skills.
- **Bootcamp Grad Only:**
  - **Action:** Test for engineering thinking beyond a curriculum. Ask about self-sufficient problem-solving (debugging) and professional practices (Git).
- **Top-Tier Institute with Average Profile:**
  - **Action:** Ignore the brand name. Evaluate purely on the merits of their work, communication, and thinking.

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

Based on a holistic, multi-stage, word-by-word deep analysis of ALL available information, generate a comprehensive interview kit. The kit must contain 4-6 competencies with a rich set of questions that follow a REAL INTERVIEW PATTERN. Adhere to all the principles described above. Structure the competencies and questions logically, provide insightful and flexible model answers as a structured array of points, and create a practical, context-aware scoring rubric. The final kit must be a comprehensive and effective tool for a recruiter, especially one who is not a domain expert. **Your output must strictly adhere to the provided JSON schema.**`,
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
