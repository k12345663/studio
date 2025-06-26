
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

const ModelAnswerPointSchema = z.object({
  text: z.string().describe("A single, concise bullet point for the model answer. This is a key talking point the candidate should cover."),
  points: z.number().int().min(0).max(10).describe("The point value for this specific bullet point. The sum of all points for a single question's model answer should ideally equal 10. A 'Note for Interviewer' should have 0 points."),
});

const QuestionSchema = z.object({
  id: z.string().describe('Unique identifier for the question.'),
  type: z.enum(['Technical', 'Scenario', 'Behavioral']).describe('Type of question.'),
  category: z.enum(['Technical', 'Non-Technical']).optional().describe("Category of the question ('Technical' or 'Non-Technical'). Preserve or update if changed by user."),
  text: z.string().describe('The text of the question. **Do not add any prefix like "Question 1:" or "1."**. Ensure it is insightful, conversational, and specific, based on the deep analysis of the JD and the candidate resume content (if provided).'),
  modelAnswerPoints: z.array(ModelAnswerPointSchema).min(2).max(5).describe("A model answer FOR THE INTERVIEWER'S USE, broken down into 2-5 specific, checkable points. The total `points` for all items in this array should sum to 10. **Every question must also include one point with the text 'Note for Interviewer: ...'** that explains how to evaluate partial answers and that practical, relevant examples from the candidate are a strong positive sign. This 'Note' should have a point value of 0."),
  difficulty: z.enum(['Naive', 'Beginner', 'Intermediate', 'Expert', 'Master']).optional().describe("The difficulty level of the question (5-point scale)."),
  estimatedTimeMinutes: z.number().optional().describe('Suitable estimated time in minutes to answer this question.'),
});

const CompetencySchema = z.object({
  id: z.string().describe('Unique identifier for the competency.'),
  name: z.string().describe('Name of the competency.'),
  importance: z.enum(['High', 'Medium', 'Low']).optional().describe('The importance of this competency for the role.'),
  questions: z.array(QuestionSchema).describe('Array of questions for the competency. Ensure questions and answers maintain high quality if modified or regenerated, referencing the original analysis of the JD and candidate resume content (if provided). Try to maintain a logical sequence of questions within competencies if edits allow.'),
});

const RubricCriterionSchema = z.object({
  name: z.string().describe("Name of the well-defined, distinct, and high-quality criterion, framed for easy use by a non-technical recruiter. It must be actionable, measurable, and directly relevant to assessing candidate suitability based on the original analysis. Example: 'Assessing Transferable Skills for Missing Skill X' or 'Evaluating Project Leadership and Impact from Project Y'."),
  weight: z.number().describe('Weight of the criterion (a value between 0.0 and 1.0, should sum to 1.0 across all criteria).'),
});

const CustomizeInterviewKitInputSchema = z.object({
  jobDescription: z.string().describe('The job description used to generate the interview kit. This is a primary source material. AI should try to parse meaningful requirements even if it contains HTML/markup or promotional fluff, focusing on core skills and responsibilities.'),
  unstopProfileLink: z.string().optional().describe("The candidate's Unstop profile link (for context only)."),
  unstopProfileDetails: z.string().optional().describe("A block of text pasted from the candidate's Unstop profile. This is a primary source for analysis."),
  candidateResumeDataUri: z.string().optional().describe("The data URI of the candidate's resume file (PDF or DOCX) that was used. If provided, AI must consider its content for refinements (skills, projects, tech stack, goals, accomplishments, challenges, education, academic achievements, past work experiences)."),
  candidateResumeFileName: z.string().optional().describe("The original file name of the candidate's resume, for context."),
  candidateExperienceContext: z.string().optional().describe('Optional brief context about the target candidate’s experience that was used and should be considered for refinements. This supplements primary sources.'),
  competencies: z.array(CompetencySchema).describe('Array of core competencies, potentially with importance, questions with category, difficulty/time. User edits are reflected here. May include "Tell me about yourself". Competencies should be informed by the holistic analysis of JD and candidate profile.'),
  rubricCriteria: z.array(RubricCriterionSchema).describe('Array of rubric criteria with weights. User edits are reflected here.'),
});
export type CustomizeInterviewKitInput = z.infer<typeof CustomizeInterviewKitInputSchema>;

const CustomizeInterviewKitOutputSchema = z.object({
  competencies: z.array(CompetencySchema).describe("Array of customized core competencies, including importance, and questions with category, difficulty/time. Questions and answers should be high-quality. Model answers should be a structured array of checkable points. All answers must guide on evaluating relevant details not on the resume and rewarding practical, original insights."),
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
  prompt: `You are "Insight-Pro," an expert AI Recruitment Analyst. Your primary function is to refine an existing, user-edited interview kit. Your goal is to ensure the user's edits are logically consistent with the deep context of the candidate's profile versus the job description, and to enhance the kit's strategic value by ensuring all questions are insightful and targeted.

# CORE MANDATE: THE INFERENCE ENGINE
Before refining any content, you MUST silently re-run your deep analysis based on the original inputs. This is your core operational logic.

**Step 1: Re-Analyze All Original Inputs**
Perform a deep, word-for-word analysis of the original Job Description, Unstop Profile Details, and especially the candidate's resume content (if provided via data URI). Your goal is to re-establish the ground truth of the candidate's journey, skills, and potential misalignments.

**Step 2: Identify Key Scenarios & Context**
Based on your re-analysis, silently flag any applicable scenarios:
- **Experience Mismatch:** Overqualified, Underqualified.
- **Career Path:** Employment Gaps, Frequent Job Switching, Domain/Role Transitions.
- **Technical Skills:** Tech Stack Mismatch, Transferable Skills.
- **Profile Depth:** Ambiguous Roles, Exaggerated Claims, Vague Project Descriptions.

# TASK: REFINE THE INTERVIEW KIT
Based *only* on the scenarios you autonomously detected and the user's explicit edits, refine the entire interview kit. Your goal is to intelligently merge the user's intent with your deep analytical insights.

**OUTPUT REQUIREMENT:**
Your output MUST adhere strictly to the provided JSON schema.
- **Preserve IDs:** All existing competency and question IDs must be preserved.
- **Enhance, Don't Just Accept:** Do not blindly accept user edits if they create a logical inconsistency. If a user deletes a question probing a critical tech stack mismatch you detected, you should refine another question to cover that topic, ensuring the interview remains strategically sound.
- **Refine Content with Depth:**
    - **Competencies & Questions:** Ensure competency names and question texts remain sharp, conversational, and deeply relevant after user edits. A question should not be generic; it should tie back to a specific project, skill, or transition from the resume.
    - **Model Answers:** All model answers (new or edited) must adhere to the required format: a structured array of 'modelAnswerPoints' where each object has 'text' and 'points'. The sum of points must equal 10, and a mandatory "Note for Interviewer" with 0 points must be included.
    - **Scoring Rubric:** Ensure rubric criteria remain flexible, actionable, and focus on assessing clarity, relevance, and problem-solving. The rubric should directly reflect your analysis. For example, if a key skill from the JD is missing, a criterion could be 'Assessing Transferable Skills for [Missing Skill]'.

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
(AI: You must perform a word-for-word deep analysis of this resume content to inform your refinements.)
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
  - Type: {{type}}, Category: {{category}}, Text: "{{text}}", (ID: {{id}})
    Model Answer Points:
    {{#each modelAnswerPoints}}
    - Text: "{{text}}", Points: {{points}}
    {{/each}}
    {{#if difficulty}}Difficulty: {{difficulty}}{{/if}}
    {{#if estimatedTimeMinutes}}Estimated Time: {{estimatedTimeMinutes}} min{{/if}}
  {{/each}}
{{/each}}

Rubric Criteria:
{{#each rubricCriteria}}
- Name: "{{name}}", Weight: {{weight}}
{{/each}}

Based on the recruiter's modifications and a holistic, word-for-word deep analysis of all original inputs, refine the entire interview kit. Preserve all existing IDs. Ensure all output fields are present. The goal is a polished, consistent, and high-quality interview kit that intelligently incorporates the recruiter's edits and adheres to all formatting and contextual requirements, making it **highly usable for non-technical recruiters** and adaptable to information shared during the interview. **Your output must strictly adhere to the provided JSON schema.**`,
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
          modelAnswerPoints: (q.modelAnswerPoints || [{ text: "Missing model answer points.", points: 0 }]).map(p => ({ text: p.text, points: p.points ?? 0 })),
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
