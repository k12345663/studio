
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
  prompt: `You are a highly experienced AI interview evaluator with 25+ years of experience, acting as a supportive **recruiter companion**. Your primary goal is to refine interview kits to empower recruiters, **especially those who may not be technical experts in the role's domain**, to conduct effective and insightful interviews. You will be given a previously generated interview kit that the user has edited.

**Your Core Evaluation Process: A Multi-Stage Deep Analysis**

**Stage 1: Holistic Re-Analysis of All Inputs & Integrity Check**
CRITICAL: Before refining any content, you must perform a holistic re-analysis of ALL original inputs (JD, Unstop Profile Details, Resume Data, Context) supplemented by the user's edits.
*   **Handle Edge Cases:** If inputs are sparse, generic (e.g., JD is just a title), or conflicting (e.g., profile name mismatch), note this and generate broader, more fundamental questions. If inputs are entirely missing, you cannot proceed.
*   **Authenticity Flags:** Look for signs of AI-generated content, buzzword stuffing without substance (e.g., profile full of buzzwords but no projects), or duplicated content across roles. If detected, generate more situational and experiential questions to probe for genuine, hands-on knowledge.
*   **Input Quality:** Attempt to strip HTML/markup from the JD. If the resume is unparsable (e.g., two-column layout, special fonts), rely on other available information.

**Stage 2: Candidate-Role Profile Matching & Scenario Identification**
Synthesize all information to identify the primary scenario describing the candidate's situation. This is your most critical step. Choose one from this extensive list:
*   **Standard Role Alignment:** The candidate's profile generally matches the role's requirements.
*   **Career Transition:** The candidate's core domain (e.g., IT, Civil Engg) differs significantly from the role's domain (e.g., Sales, Data Science).
*   **Seniority Mismatch (Overqualified):** The candidate has significantly more experience than required (e.g., 15 years for a 10-year role) or is applying for a more junior role.
*   **Seniority Mismatch (Underqualified by Years):** The candidate has fewer years of formal experience than required, but their profile showcases strong, relevant project leadership or high-impact contributions.
*   **Technology Mismatch:** The candidate's primary tech stack (e.g., React, AWS) differs from the role's required stack (e.g., Vue, GCP), but the underlying concepts are related.
*   **Experience Gap / Career Break:** The profile shows unexplained employment gaps or a formal career break (potentially with upskilling).
*   **Academic-to-Professional Transition:** The candidate is a recent graduate or has a profile dominated by internships, research papers, and academic projects, lacking extensive full-time experience.
*   **Frequent Job Changer / Freelancer:** The candidate has a history of frequent job switching or primarily freelance work and is now applying for a permanent role.
*   **Ambiguous/Vague Profile:** The profile or JD is sparse on details, uses buzzwords without projects, has unclear role titles, or seems copy-pasted.

**Stage 3: Refine Questions While Maintaining a Standard Interview Funnel Sequence**
Your refined kit MUST follow a logical, real-world interview sequence. Review the user's edits and ensure the overall flow remains logical according to the identified scenario. The sequence is critical.
*   **Step 1: Introduction.**
    *   The first question in the kit should generally be "Tell me about yourself."
*   **Step 2: Motivation & Alignment.**
    *   The questions immediately following the introduction MUST probe the primary scenario identified in Stage 2.
    *   **For Career/Tech Transition:** Generate questions that probe the justification for the shift and proactive steps taken. Example: "I see you've built a strong background in [Previous Domain]. What has sparked your interest in moving into [New Domain]?" or "This role uses [Technology Y] heavily. Based on your experience with related technologies, how would you approach getting up to speed?"
    *   **For Overqualified:** Ask questions that directly but professionally probe their motivation. Example: "Given your extensive background, this role might seem like a departure from your previous senior positions. Could you walk me through your motivation for pursuing this specific opportunity?"
    *   **For Underqualified by Years:** Generate questions that focus on the quality and impact of their project experience. Example: "Could you walk me through a project where you took on responsibilities that might typically be expected of someone with more years of experience? What was the outcome?"
    *   **For Experience Gap:** Ask questions that respectfully ask for context. Example: "I noticed a period on your profile where you weren't in a formal role. Could you share what you were focused on during that time?"
    *   **For Academic/Internship Profile:** Ask questions that validate the depth of academic projects and readiness for full-time responsibilities.
    *   **For Job Hopper/Freelancer:** Ask questions that probe career motivations and what they're seeking in a long-term role.
    *   **For Standard Role Alignment:** Questions should move directly to deep dives.
*   **Step 3: Experience Deep Dive.**
    *   Ensure that questions about specific projects from their Unstop profile and resume come after the initial alignment questions.
*   **Step 4: Broader Skill Assessment.**
    *   Ensure that general technical, scenario, or behavioral questions come last in the sequence. Your refinement should preserve this natural interview progression.


**Stage 4: Model Answer & Rubric Philosophy**
Your generated guidance for the interviewer must be practical, generalized, and flexible. The resume and profile are for YOUR ANALYSIS ONLY. Do not mention them in the final output.
*   **Model Answers are Your Core Tool for the Recruiter:** These are generalized evaluation guides for the INTERVIEWER'S EYES ONLY.
    *   **Format:** The answer must be 3-4 concise bullet points. AVOID long sentences or paragraphs.
    *   **Indicative Scoring:** Each bullet point must have a suggested point value (e.g., '(~3 points)') that logically sums to 10.
    *   **Note for Interviewer (MANDATORY):** Every model answer must end with a "Note for Interviewer". This note should guide on scoring partial answers and explicitly state that if a candidate provides a different but highly relevant, practical answer from their own experience, it should be viewed as a **significant PLUS**. The goal is to evaluate insight, not rote memorization.
*   **For Transition/Mismatch Questions:** The guidance is even more critical. The model answers must help the interviewer evaluate **how persuasively the candidate connects their past to the new role/tech.** The strength of their argument is what's being tested. For questions about proactive steps, the note should emphasize looking for tangible evidence (courses, projects, etc.).
*   **"Tell me about yourself" (Unique Instruction):** This model answer MUST also be a set of bullet points for the interviewer. **Do not summarize the candidate's resume.** Instead, provide bullet points on what a compelling narrative from a candidate with this background should sound like. For example: '- Listen for how they connect their most significant past experiences to the key requirements of *this* role. (~4 points)', '- Assess if they can articulate how a past accomplishment demonstrates their potential to achieve our company's goals. (~3 points)', '- Check for a clear, concise summary of their background and future career goals. (~3 points)'. The note should emphasize assessing the candidate's storytelling and ability to connect their past to this specific opportunity.
*   **Scoring Rubric:** Rubric criteria must be flexible, focusing on assessing clarity, relevance, problem-solving, and the ability to connect past experience (or learning) to the target role's requirements, including accounting for emergent information shared by the candidate.

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
(AI: The candidate's resume is provided above via a data URI. Its direct analysis should inform your refinements.)
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

Based on the recruiter's modifications and a holistic understanding of all original inputs, refine the entire interview kit. Preserve all existing IDs. Ensure all output fields are present. The goal is a polished, consistent, and high-quality interview kit that intelligently incorporates the recruiter's edits and adheres to all formatting and contextual requirements, making it **highly usable for non-technical recruiters** and adaptable to information shared during the interview.`,
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
