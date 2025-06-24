
'use server';

/**
 * @fileOverview This file defines a Genkit flow for customizing an interview kit.
 *
 * It allows recruiters to tweak question wording, re-weight scoring criteria, and regenerate questions.
 * It emphasizes a recruiter-centric approach, especially for non-technical evaluators,
 * focusing on generic yet pillar-covering answers and guidance on real-life examples.
 * It aims to maintain a logical question flow and deep engagement with JD, Unstop profile link, and candidate resume file content.
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
  text: z.string().describe('The text of the question. Ensure it is insightful and specific, considering JD, Unstop Profile (compulsory input, conceptually treat as if analyzing the live profile) and Candidate Resume File Content (optional input, AI will analyze its content directly if provided via data URI, including projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, past work experiences & context).'),
  modelAnswer: z.string().describe("A model answer FOR THE INTERVIEWER'S USE, presented as a few concise bullet points. Each bullet point must suggest an indicative contribution to the question's 10-point score (e.g., 'approx. 2-3 points'). These points are a rapid mental checklist for a non-technical recruiter. Most importantly, the guidance must state that if a candidate provides practical, relevant, or original examples not listed, it should be seen as a strong positive sign of depth. The goal is to assess understanding, not just check off points."),
  difficulty: z.enum(['Naive', 'Beginner', 'Intermediate', 'Expert', 'Master']).optional().describe("The difficulty level of the question (5-point scale)."),
  estimatedTimeMinutes: z.number().optional().describe('Suitable estimated time in minutes to answer this question.'),
});

const CompetencySchema = z.object({
  id: z.string().describe('Unique identifier for the competency.'),
  name: z.string().describe('Name of the competency.'),
  importance: z.enum(['High', 'Medium', 'Low']).optional().describe('The importance of this competency for the role.'),
  questions: z.array(QuestionSchema).describe('Array of questions for the competency. Ensure questions and answers maintain high quality if modified or regenerated, referencing JD and candidate profile (Unstop Profile Link - compulsory, conceptually treat as if analyzing the live profile, and especially the Resume File Content - optional input, AI will analyze its content directly if provided via data URI, including projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences). Try to maintain a logical sequence of questions within competencies if edits allow.'),
});

const RubricCriterionSchema = z.object({
  name: z.string().describe("Name of the well-defined, distinct, and high-quality criterion, framed for easy use by a non-technical recruiter. It must be actionable, measurable, and directly relevant to assessing candidate suitability. Focus on parameters like 'Clarity of Explanation', 'Relevance of Answer', 'Depth of Understanding (considering resume file details [AI to analyze if provided] and relevant emergent information shared by candidate)'. Each criterion MUST explicitly mention key phrases, skills, concepts, project types, or relevant academic achievements from the Job Description AND/OR the Candidate's Unstop Profile/Resume File Content (including specific projects, their tech stack, goals, accomplishments, challenges, educational background, academic achievements, or past work experiences) where appropriate. The set of criteria should provide a broad yet deeply contextual basis for evaluating the candidate comprehensively, understandable by someone not expert in the role's domain."),
  weight: z.number().describe('Weight of the criterion (a value between 0.0 and 1.0, should sum to 1.0 across all criteria).'),
});

const CustomizeInterviewKitInputSchema = z.object({
  jobDescription: z.string().describe('The job description used to generate the interview kit. This is a primary source material. AI should try to parse meaningful requirements even if it contains HTML/markup or promotional fluff, focusing on core skills and responsibilities.'),
  unstopProfileLink: z.string().optional().describe("The candidate's Unstop profile link (compulsory input). This is a primary source material if provided; AI should (conceptually) treat this as if accessing and deeply analyzing the candidate's entire live profile if it was used and should be considered for refinements."),
  candidateResumeDataUri: z.string().optional().describe("The data URI of the candidate's resume file (PDF or DOCX) that was used. If provided, AI should consider its content for refinements (skills, projects, tech stack, goals, accomplishments, challenges, education, academic achievements, past work experiences)."),
  candidateResumeFileName: z.string().optional().describe("The original file name of the candidate's resume, for context."),
  candidateExperienceContext: z.string().optional().describe('Optional brief context about the target candidate’s experience that was used and should be considered for refinements. This supplements primary sources.'),
  competencies: z.array(CompetencySchema).describe('Array of core competencies, potentially with importance, questions with category, difficulty/time. User edits are reflected here. May include "Tell me about yourself". Competencies should be informed by the holistic analysis of JD and candidate profile (Unstop Profile/Resume file content including educational background and academic achievements), and cover core JD skills.'),
  rubricCriteria: z.array(RubricCriterionSchema).describe('Array of rubric criteria with weights. User edits are reflected here.'),
});
export type CustomizeInterviewKitInput = z.infer<typeof CustomizeInterviewKitInputSchema>;

const CustomizeInterviewKitOutputSchema = z.object({
  competencies: z.array(CompetencySchema).describe("Array of customized core competencies, including importance, and questions with category, difficulty/time. Questions and answers should be high-quality. Model answers should be brief, interviewer-focused checklists. For 'Tell me about yourself', model answers should be a more descriptive interviewer-focused guide based on the Unstop Profile/Resume file content. All answers must guide on evaluating relevant details not on the resume and rewarding practical, original insights."),
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
  prompt: `You are a highly experienced AI interview evaluator with 25 years of experience, acting as a supportive **recruiter companion**. Your primary goal is to refine interview kits to empower recruiters, **especially those who may not be technical experts in the role's domain**, to conduct effective and insightful interviews. You will be given a previously generated interview kit that the user has edited.

**Your Core Evaluation Process:**

CRITICAL: Before refining any content, you must perform a holistic analysis of ALL original inputs (JD, Unstop Profile, Resume Data, Context) supplemented by the user's edits.

1.  **Detect Role Alignment and Career Transitions:**
    *   First, parse the Job Description to identify the target role and its core skill requirements.
    *   Next, analyze the candidate's profile (Unstop Profile and Resume content, if provided).
    *   **Crucially, compare the candidate's documented skills and experience against the target role's requirements.** This comparison is the basis for your entire refinement strategy.
    *   If you detect a significant mismatch that suggests a **career transition** (e.g., a candidate with a Software Engineering background applying for a Sales Manager role), your refinements must prioritize questions that probe this transition.
    *   If you detect a **senior candidate** (e.g., "Manager," "Director," 10+ years) applying for a more junior role, this is a critical point to probe.

2.  **Refine Questions while Maintaining a Logical Sequence:** Your refined kit MUST follow a standard real interview pattern. Review the user's edits and ensure the overall flow remains logical.
    *   **The first question should generally be "Tell me about yourself."**
    *   **Then, ensure the flow follows the appropriate path based on your analysis:**
        *   **Path A: Career Transition Detected:** The questions immediately following the intro should probe the justification for the shift. If the user has removed these, you should refine other questions or add notes to steer the conversation back to this crucial topic. Questions should challenge the candidate to build the bridge themselves (e.g., "What motivates your transition?," "Which past experiences are most transferable and why?," "What steps have you taken to learn about this new domain?").
        *   **Path B: Seniority Mismatch Detected:** Questions probing the motivation for a seniority change (e.g., "What interests you about returning to a more hands-on role at this time?") should appear early in the interview, right after the introduction.
        *   **Path C: Standard Role Alignment:** The questions following the intro should be deep-dives into their resume/profile projects to validate their experience directly.
    *   **Overall Flow:** Ensure that project-specific and skill-validation questions come before more general technical or behavioral questions. Your refinement should preserve this natural interview progression.

3.  **Handle Non-Disclosure Cases & Ambiguity:**
    *   If a candidate's profile or answers seem to describe relevant skills and experiences without explicitly stating a previous role title, **focus on the substance of that experience.** Your refined model answers should guide the interviewer to evaluate the *relevance of the described tasks and learnings*, not the title itself.
    *   If inputs were vague or unparseable, your refinements should produce broader, more fundamental questions and note in the model answers that the interviewer may need to probe for more detail.

**Model Answer & Rubric Philosophy:**

Your refined guidance for the interviewer must be practical, generalized, and flexible.

*   **Model Answers are Generalized Evaluation Guides, Not Rigid Scripts:**
    *   The bullet points should represent GENERALIZED principles, core concepts, or key thought processes to listen for. They are not a verbatim checklist.
    *   **Indicative Scoring:** Each bullet point in the model answer must have an indicative point value (e.g., '(~3 points)'). This provides a loose framework for scoring, but is not a rigid calculation. The total of these indicative points should logically sum to 10 for each question.
    *   **CRITICAL: Note for Interviewer:** Every refined model answer must also guide the interviewer that if a candidate provides a different, but highly relevant and practical answer from their own experience, it should be viewed as a **significant PLUS** and can be awarded points, even if it's not one of the checklist items. The goal is to evaluate real-world problem-solving, not rote memorization.
*   **"Tell me about yourself" (Exception):** The model answer for this specific question is unique. When refining it, ensure it remains a descriptive guide **FOR THE INTERVIEWER**, not a script for the candidate. It should be framed to help a non-technical recruiter assess the relevance of the candidate's introduction. It should pull specific details from the candidate's profile (Unstop, resume content) and suggest what a strong answer should connect. For example: '*Candidate should connect their project on X to our need for Y...*', '*Listen for how they frame their past experience at Z as preparation for this role...*'. The goal is to equip the interviewer to evaluate how well the candidate can tell their own story and connect it to the job.
*   **Scoring Rubric:** The rubric criteria must be well-defined, distinct, high-quality, actionable, and measurable. They should focus on assessing clarity, relevance, problem-solving, and the ability to connect past experience (or learning) to the target role's requirements, including accounting for emergent information shared by the candidate. Ensure weights sum to 1.0.


Job Description (Primary Source, for context):
{{{jobDescription}}}

Unstop Profile Link (Primary Source - COMPULSORY, for context and primary reference; **conceptually treat as if accessing and deeply analyzing the live profile**):
{{{unstopProfileLink}}}

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
    
