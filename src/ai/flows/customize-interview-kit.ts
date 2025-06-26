
'use server';

/**
 * @fileOverview This file defines a Genkit flow for customizing an interview kit.
 *
 * It allows recruiters to tweak question wording, re-weight scoring criteria, and regenerate questions.
 * It emphasizes a recruiter-centric approach, especially for non-technical evaluators,
 * focusing on generic yet pillar-covering answers and guidance on real-life examples.
 * It aims to maintain a logical question flow and deep engagement with JD, Unstop profile details, and candidate resume file content.
 * It also guides the AI to consider information shared by the candidate during the interview that might not be on the resume.
 * - customizeInterviewKit - A function that handles the interview kit customization process.
 * - CustomizeInterviewKitInput - The input type for the customizeInterviewKit function.
 * - CustomizeInterviewKitOutput - The return type for the customizeInterviewKit function.
 */

import {ai} from '@/ai/genkit';
import {z}from 'genkit';
import type { QuestionDifficulty } from '@/types/interview-kit';

const difficultyTimeMap: Record<QuestionDifficulty, number> = {
  Naive: 2,
  Beginner: 4,
  Intermediate: 6,
  Expert: 8,
  Master: 10,
};


const QuestionSchema = z.object({
  id: z.string().describe('Unique identifier for the question.'),
  type: z.enum(['Technical', 'Scenario', 'Behavioral']).describe('Type of question.'),
  category: z.enum(['Technical', 'Non-Technical']).optional().describe("Category of the question ('Technical' or 'Non-Technical'). Preserve or update if changed by user."),
  text: z.string().describe('The text of the question. **Do not add any prefix like "Question 1:" or "1."**. Ensure it is insightful and specific, considering JD, Unstop Profile Details (pasted text to be analyzed directly), and Candidate Resume File Content (optional input, AI will analyze its content directly if provided via data URI, including projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, past work experiences & context).'),
  modelAnswer: z.string().describe("A model answer FOR THE INTERVIEWER'S USE. **CRITICAL: Format this as 3-4 concise bullet points, not a paragraph.** Each bullet point must suggest an indicative contribution to the question's 10-point score (e.g., 'approx. 2-3 points'). These points are a rapid mental checklist for a non-technical recruiter. **Every model answer must include a 'Note for Interviewer' section** that explains how to evaluate partial answers and explicitly states that if a candidate provides practical, relevant, or original examples not listed, it should be seen as a strong positive sign of depth. The goal is to assess understanding, not just check off points."),
  difficulty: z.enum(['Naive', 'Beginner', 'Intermediate', 'Expert', 'Master']).optional().describe("The difficulty level of the question (5-point scale)."),
  estimatedTimeMinutes: z.number().optional().describe('Suitable estimated time in minutes to answer this question.'),
});

const CompetencySchema = z.object({
  id: z.string().describe('Unique identifier for the competency.'),
  name: z.string().describe('Name of the competency.'),
  importance: z.enum(['High', 'Medium', 'Low']).optional().describe('The importance of this competency for the role.'),
  questions: z.array(QuestionSchema).describe('Array of questions for the competency. Ensure questions and answers maintain high quality if modified or regenerated, referencing JD and candidate profile (Unstop Profile Details - pasted text to be analyzed directly, and especially the Resume File Content - optional input, AI will analyze its content directly if provided via data URI, including projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences). Try to maintain a logical sequence of questions within competencies if edits allow.'),
});

const RubricCriterionSchema = z.object({
  name: z.string().describe("Name of the well-defined, distinct, and high-quality criterion, framed for easy use by a non-technical recruiter. It must be actionable, measurable, and directly relevant to assessing candidate suitability. Focus on parameters like 'Clarity of Explanation', 'Relevance of Answer', 'Depth of Understanding (considering resume file details [AI to analyze if provided] and relevant emergent information shared by candidate)'. Each criterion MUST explicitly mention key phrases, skills, concepts, project types, or relevant academic achievements from the Job Description AND/OR the Candidate's Unstop Profile Details/Resume File Content (including specific projects, their tech stack, goals, accomplishments, challenges, educational background, academic achievements, or past work experiences) where appropriate. The set of criteria should provide a broad yet deeply contextual basis for evaluating the candidate comprehensively, understandable by someone not expert in the role's domain."),
  weight: z.number().describe('Weight of the criterion (a value between 0.0 and 1.0, should sum to 1.0 across all criteria).'),
});

const CustomizeInterviewKitInputSchema = z.object({
  jobDescription: z.string().describe('The job description used to generate the interview kit. This is a primary source material. AI should try to parse meaningful requirements even if it contains HTML/markup or promotional fluff, focusing on core skills and responsibilities.'),
  unstopProfileLink: z.string().optional().describe("The candidate's Unstop profile link (for context only)."),
  unstopProfileDetails: z.string().optional().describe("A block of text pasted from the candidate's Unstop profile. This is a primary source for analysis."),
  candidateResumeDataUri: z.string().optional().describe("The data URI of the candidate's resume file (PDF or DOCX) that was used. If provided, AI should consider its content for refinements (skills, projects, tech stack, goals, accomplishments, challenges, education, academic achievements, past work experiences)."),
  candidateResumeFileName: z.string().optional().describe("The original file name of the candidate's resume, for context."),
  candidateExperienceContext: z.string().optional().describe('Optional brief context about the target candidate’s experience that was used and should be considered for refinements. This supplements primary sources.'),
  competencies: z.array(CompetencySchema).describe('Array of core competencies, potentially with importance, questions with category, difficulty/time. User edits are reflected here. May include "Tell me about yourself". Competencies should be informed by the holistic analysis of JD and candidate profile (Unstop Profile details/Resume file content including educational background and academic achievements), and cover core JD skills.'),
  rubricCriteria: z.array(RubricCriterionSchema).describe('Array of rubric criteria with weights. User edits are reflected here.'),
});
export type CustomizeInterviewKitInput = z.infer<typeof CustomizeInterviewKitInputSchema>;

const CustomizeInterviewKitOutputSchema = z.object({
  competencies: z.array(CompetencySchema).describe("Array of customized core competencies, including importance, and questions with category, difficulty/time. Questions and answers should be high-quality. Model answers should be brief, interviewer-focused checklists presented as concise bullet points. All answers must guide on evaluating relevant details not on the resume and rewarding practical, original insights."),
  rubricCriteria: z.array(RubricCriterionSchema).describe("Array of customized rubric criteria with weights. Ensure weights sum to 1.0 and criteria are well-defined, actionable, measurable, and reference JD/candidate profile for a contextual evaluation usable by non-technical recruiters, accounting for emergent candidate information."),
});
export type CustomizeInterviewKitOutput = z.infer<typeof CustomizeInterviewKitOutputSchema>;

export async function customizeInterviewKit(input: CustomizeInterviewKitInput): Promise<CustomizeInterviewKitOutput> {
  return customizeInterviewKitFlow(input);
}

const customizeInterviewKitPrompt = ai.definePrompt({
  name: 'customizeInterviewKitPrompt',
  input: {schema: CustomizeInterviewKitInputSchema},
  output: {schema: CustomizeInterviewKitOutputSchema},
  prompt: `You are "Recruiter Copilot," an expert AI assistant for talent acquisition professionals. Your primary function is to analyze a recruiter's edits to an existing interview kit and refine it to be more strategic and conversational. Your goal is to act as a true strategic partner. This means you must re-run your deep, word-by-word analysis of the original JD and resume, identify the core hiring scenarios from your knowledge base, and ensure the user's edits—and your refinements—are logical, relevant, and consistently aligned with that deep context.

**Your Core Evaluation Process: A Multi-Stage Deep Analysis**

**Stage 1: Holistic Re-Analysis of All Inputs & User Edits**
CRITICAL: Before refining any content, you must perform a meticulous, word-by-word deep analysis of ALL original inputs (JD, Unstop Profile Details, Resume Data, Context) supplemented by the user's edits.

**Stage 2: Re-run Scenario Identification**
*   Based on your deep analysis, silently re-identify the core scenario(s) from the Knowledge Base below. Your primary goal is to ensure the user's edits haven't disrupted the logical flow required to address this core scenario.
*   If the user's edits have weakened a crucial line of inquiry (e.g., deleted a question about motivation for an overqualified candidate), you must refine another question or add one back to gently probe the topic, guided by the actions in the Knowledge Base.

**Stage 3: Refine the Interview Funnel Sequence**
Your refined kit MUST maintain a logical, real-world interview sequence. Review the user's edits and ensure the overall flow remains logical, following the Opener -> Alignment -> Deep Dive -> Broader Assessment pattern.

**Stage 4: Refine Model Answers & Rubric with Enhanced Intelligence**
Your generated guidance for the interviewer must be practical, generalized, and flexible.
*   **Domain-Specific Refinement:** When refining, ensure that questions testing domain knowledge (e.g., about Fintech regulations, if applicable based on the original JD) are sharp, relevant, and reflect any user edits. If a user adds a domain-specific question, ensure your refined model answer is practical and shows an understanding of that industry's context.
*   **Model Answers:** Ensure all model answers (new or edited) adhere to the required format (3-4 concise bullet points, indicative scoring, mandatory "Note for Interviewer").
*   **"Tell me about yourself" (Unique Instruction):** If this question exists, ensure its model answer is a guide for the interviewer on what to listen for, not a summary of the candidate's resume.
*   **Scoring Rubric:** Ensure rubric criteria remain flexible, actionable, and focus on assessing clarity, relevance, and problem-solving.

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

Job Description (Primary Source, for context):
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
(AI: You must perform a word-by-word deep analysis of this resume content to inform your refinements.)
{{else}}
No candidate resume file was provided for initial generation.
{{/if}}

{{#if candidateExperienceContext}}
Candidate Experience Context (additional notes on candidate's background):
{{{candidateExperienceContext}}}
{{/if}}

Recruiter's Edited Interview Kit:
Competencies and Questions:
{{#each competencies}}
- Competency Name: "{{name}}" (ID: {{id}})
  {{#if importance}}Importance: {{importance}}{{/if}}
  Questions:
  {{#each questions}}
  - Type: {{type}}, Category: {{category}}, Text: "{{text}}", Model Answer: "{{modelAnswer}}" (ID: {{id}})
    {{#if difficulty}}Difficulty: {{difficulty}}{{/if}}
    {{#if estimatedTimeMinutes}}Estimated Time: {{estimatedTimeMinutes}} min{{/if}}
  {{/each}}
{{/each}}

Rubric Criteria:
{{#each rubricCriteria}}
- Name: "{{name}}", Weight: {{weight}}
{{/each}}

Based on the recruiter's modifications and a holistic, word-by-word deep analysis of all original inputs, refine the entire interview kit. Preserve all existing IDs. Ensure all output fields are present. The goal is a polished, consistent, and high-quality interview kit that intelligently incorporates the recruiter's edits and adheres to all formatting and contextual requirements, making it **highly usable for non-technical recruiters** and adaptable to information shared during the interview. **Your output must strictly adhere to the provided JSON schema.**`,
});

const customizeInterviewKitFlow = ai.defineFlow(
  {
    name: 'customizeInterviewKitFlow',
    inputSchema: CustomizeInterviewKitInputSchema,
    outputSchema: CustomizeInterviewKitOutputSchema,
  },
  async input => {
    const {output} = await customizeInterviewKitPrompt(input);
    if (!output) {
      throw new Error("AI failed to customize interview kit content.");
    }
    const validatedOutput = {
      ...output,
      competencies: output.competencies.map(comp => ({
        ...comp,
        importance: comp.importance || 'Medium',
        questions: comp.questions.map(q => ({
          ...q,
          category: q.category || (q.type === 'Technical' ? 'Technical' : 'Non-Technical'),
          difficulty: q.difficulty || 'Intermediate',
          estimatedTimeMinutes: q.estimatedTimeMinutes || (difficultyTimeMap[q.difficulty || 'Intermediate']),
          text: q.text || "Missing question text. AI should refine this based on JD/Unstop Profile/Resume File Content.",
          modelAnswer: q.modelAnswer || "Missing model answer. AI should provide guidance from an interviewer's perspective on a few brief keywords/short phrases the candidate should cover, informed by JD/Unstop Profile/Resume File Content/context (and how to evaluate relevant, original details not on resume), making it easy for a non-technical recruiter to judge. For 'Tell me about yourself', it should guide on what a candidate with this specific Unstop/Resume background should cover.",
        })),
      })),
      rubricCriteria: output.rubricCriteria.map(rc => ({
          ...rc,
          name: rc.name || "Unnamed Criterion (must be well-defined, distinct, high-quality, actionable, measurable, contextually reference JD/Unstop Profile/Resume File Content, considering emergent details, for comprehensive evaluation by a non-technical recruiter). AI should refine this.",
          weight: typeof rc.weight === 'number' ? Math.max(0, Math.min(1, rc.weight)) : 0.2,
      }))
    };

    let totalWeight = validatedOutput.rubricCriteria.reduce((sum, crit) => sum + crit.weight, 0);
    if (validatedOutput.rubricCriteria.length > 0) {
        if (totalWeight === 0 && validatedOutput.rubricCriteria.length > 0) {
            const equalWeight = parseFloat((1.0 / validatedOutput.rubricCriteria.length).toFixed(2));
            let sum = 0;
            validatedOutput.rubricCriteria.forEach((crit, index, arr) => {
                if(index < arr.length -1) {
                    crit.weight = equalWeight;
                    sum += equalWeight;
                } else {
                    crit.weight = parseFloat(Math.max(0,(1.0 - sum)).toFixed(2));
                }
            });
             totalWeight = validatedOutput.rubricCriteria.reduce((s, c) => s + c.weight, 0); // Recalculate
        }
        if (Math.abs(totalWeight - 1.0) > 0.001) { // Allow for small floating point inaccuracies
            const factor = 1.0 / totalWeight;
            let sumOfNormalizedWeights = 0;
            validatedOutput.rubricCriteria.forEach((crit, index, arr) => {
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
            totalWeight = validatedOutput.rubricCriteria.reduce((s, c) => s + c.weight, 0);
            if (Math.abs(totalWeight - 1.0) > 0.001 && validatedOutput.rubricCriteria.length > 0) {
                const diff = 1.0 - totalWeight;
                const lastCritWeight = validatedOutput.rubricCriteria[validatedOutput.rubricCriteria.length -1].weight;

                validatedOutput.rubricCriteria[validatedOutput.rubricCriteria.length -1].weight =
                    parseFloat(Math.max(0, lastCritWeight + diff).toFixed(2));
            }
        }
    }

    // Ensure no individual weight is negative after all adjustments and that the sum is truly 1.0
    // And handle the case where all weights became zero due to aggressive rounding or tiny initial values
    let finalSum = validatedOutput.rubricCriteria.reduce((sum, crit) => {
        crit.weight = Math.max(0, crit.weight); // Ensure no negative weights
        return sum + crit.weight;
    },0);
    

    if (validatedOutput.rubricCriteria.length > 0 && Math.abs(finalSum - 1.0) > 0.001) {
        // If sum is zero but items exist, distribute equally.
        if (finalSum === 0) {
            const equalWeight = parseFloat((1.0 / validatedOutput.rubricCriteria.length).toFixed(2));
            let currentSum = 0;
            validatedOutput.rubricCriteria.forEach((crit, index, arr) => {
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
            for (let i = 0; i < validatedOutput.rubricCriteria.length - 1; i++) {
                const normalized = (validatedOutput.rubricCriteria[i].weight * scaleFactor);
                validatedOutput.rubricCriteria[i].weight = parseFloat(normalized.toFixed(2));
                cumulativeWeight += validatedOutput.rubricCriteria[i].weight;
            }
             // Last element takes the remainder to ensure sum is exactly 1.0
            const lastWeight = 1.0 - cumulativeWeight;
            if (validatedOutput.rubricCriteria.length > 0) {
                validatedOutput.rubricCriteria[validatedOutput.rubricCriteria.length - 1].weight = parseFloat(Math.max(0, lastWeight).toFixed(2));
            }
        }
    }
     // Final pass to ensure the last element adjustment for sum to 1.0 didn't make other weights sum > 1
    // This typically occurs if all weights were tiny and normalized to 0.00, then the last one got 1.00
    if (validatedOutput.rubricCriteria.length > 1) {
        let checkSum = 0;
        validatedOutput.rubricCriteria.forEach(c => checkSum += c.weight);
        if (Math.abs(checkSum - 1.0) > 0.001) { // If still off, likely due to rounding small numbers
           const lastIdx = validatedOutput.rubricCriteria.length - 1;
           let sumExceptLast = 0;
           for(let i=0; i < lastIdx; i++) {
               sumExceptLast += validatedOutput.rubricCriteria[i].weight;
           }
           validatedOutput.rubricCriteria[lastIdx].weight = parseFloat(Math.max(0, 1.0 - sumExceptLast).toFixed(2));
        }
    } else if (validatedOutput.rubricCriteria.length === 1) {
        validatedOutput.rubricCriteria[0].weight = 1.0; // If only one criterion, it must be 1.0
    }

    return validatedOutput;
  }
);
