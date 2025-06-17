
'use server';

/**
 * @fileOverview This file defines a Genkit flow for customizing an interview kit.
 *
 * It allows recruiters to tweak question wording, re-weight scoring criteria, and regenerate questions.
 * It emphasizes a recruiter-centric approach, especially for non-technical evaluators,
 * focusing on generic yet pillar-covering answers and guidance on real-life examples.
 * It aims to maintain a logical question flow and deep engagement with JD and candidate profile (resume/Unstop data).
 * - customizeInterviewKit - A function that handles the interview kit customization process.
 * - CustomizeInterviewKitInput - The input type for the customizeInterviewKit function.
 * - CustomizeInterviewKitOutput - The return type for the customizeInterviewKit function.
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


const QuestionSchema = z.object({
  id: z.string().describe('Unique identifier for the question.'),
  type: z.enum(['Technical', 'Scenario', 'Behavioral']).describe('Type of question.'),
  category: z.enum(['Technical', 'Non-Technical']).optional().describe("Category of the question ('Technical' or 'Non-Technical'). Preserve or update if changed by user."),
  text: z.string().describe('The text of the question. Ensure it is insightful and specific, considering JD and candidate profile (resume/profile data including projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, past work experiences & context).'),
  modelAnswer: z.string().describe("A model answer from the RECRUITER'S PERSPECTIVE, presented as 3-4 concise bullet points. Each bullet MUST outline KEY POINTS A CANDIDATE SHOULD COVER for a strong answer, making it easy for a non-technical recruiter to judge. It should be generic enough to cover fundamental concepts (e.g., 'Candidate explains X, Y, Z for [topic]') yet be informed by the candidate's profile and JD by EXPLICITLY referencing terms, skills, projects, or experiences from the Job Description, Candidate Resume/Profile, or context. Example: 'Interviewer should note if candidate covers: 1. Core concept A. 2. Application B related to [JD skill/Resume project].' Include a brief note if applicable: 'Note: If candidate provides strong real-life examples, this signifies deeper understanding.' For 'Tell me about yourself', if a resume/profile is provided, the model answer MUST guide the recruiter on key points from the candidate's specific background (work history, projects, education) that would constitute a strong introduction. The candidate's resume/profile (including projects, past work experiences, educational background) should be a key reference for validating and refining model answers."),
  difficulty: z.enum(['Naive', 'Beginner', 'Intermediate', 'Expert', 'Master']).optional().describe("The difficulty level of the question (5-point scale)."),
  estimatedTimeMinutes: z.number().optional().describe('Suitable estimated time in minutes to answer this question.'),
});

const CompetencySchema = z.object({
  id: z.string().describe('Unique identifier for the competency.'),
  name: z.string().describe('Name of the competency.'),
  importance: z.enum(['High', 'Medium', 'Low']).optional().describe('The importance of this competency for the role.'),
  questions: z.array(QuestionSchema).describe('Array of questions for the competency. Ensure questions and answers maintain high quality if modified or regenerated, referencing JD and candidate profile (especially the resume/profile data, including projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences). Try to maintain a logical sequence of questions within competencies if edits allow.'),
});

const RubricCriterionSchema = z.object({
  name: z.string().describe("Name of the well-defined, distinct, and high-quality criterion, framed for a non-technical recruiter. It must be actionable, measurable, and directly relevant to assessing candidate suitability. Focus on parameters like 'Clarity of Explanation', 'Relevance of Answer', 'Depth of Understanding'. Each criterion MUST explicitly mention key phrases, skills, concepts, project types, or relevant academic achievements from the Job Description AND/OR the Candidate Resume/Profile (including specific projects, their tech stack, goals, accomplishments, challenges, educational background, academic achievements, or past work experiences) where appropriate. The set of criteria should provide a broad yet deeply contextual basis for evaluating the candidate comprehensively, understandable by someone not expert in the role's domain."),
  weight: z.number().describe('Weight of the criterion (a value between 0.0 and 1.0, should sum to 1.0 across all criteria).'),
});

const CustomizeInterviewKitInputSchema = z.object({
  jobDescription: z.string().describe('The job description used to generate the interview kit. This is a primary source material.'),
  candidateExperienceContext: z.string().optional().describe('Optional brief context about the target candidate’s experience that was used and should be considered for refinements. This supplements primary sources.'),
  candidateResume: z.string().optional().describe("The full text of the candidate's resume (potentially from pasted text, parsed PDF/DOC, or Unstop profile data) that was used and should be considered for refinements. This is a key reference document for tailoring, including specific projects mentioned (their tech stack, goals, accomplishments, challenges), educational background, academic achievements, and past work experiences. Analyze it deeply."),
  competencies: z.array(CompetencySchema).describe('Array of core competencies, potentially with importance, questions with category, difficulty/time. User edits are reflected here. May include "Tell me about yourself". Competencies should be informed by the holistic analysis of JD and candidate profile (including educational background and academic achievements from resume/profile).'),
  rubricCriteria: z.array(RubricCriterionSchema).describe('Array of rubric criteria with weights. User edits are reflected here.'),
});
export type CustomizeInterviewKitInput = z.infer<typeof CustomizeInterviewKitInputSchema>;

const CustomizeInterviewKitOutputSchema = z.object({
  competencies: z.array(CompetencySchema).describe("Array of customized core competencies, including importance, and questions with category, difficulty/time. Quality of questions and answers should be maintained or enhanced, with answers from a recruiter's perspective (3-4 bullet points highlighting key points to cover) referencing JD and candidate profile (resume/profile data including projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, past work experiences & context). 'Tell me about yourself' model answers should remain recruiter-focused guides based on the resume/profile. Questions should aim for a logical flow where appropriate."),
  rubricCriteria: z.array(RubricCriterionSchema).describe("Array of customized rubric criteria with weights. Ensure weights sum to 1.0 and criteria are well-defined, distinct, high-quality, actionable, measurable, and reference JD and candidate profile (resume/profile data including projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, past work experiences & context) for a broad yet deeply contextual evaluation usable by non-technical recruiters. Focus on parameters like 'Clarity', 'Relevance', 'Depth'."),
});
export type CustomizeInterviewKitOutput = z.infer<typeof CustomizeInterviewKitOutputSchema>;

export async function customizeInterviewKit(input: CustomizeInterviewKitInput): Promise<CustomizeInterviewKitOutput> {
  return customizeInterviewKitFlow(input);
}

const customizeInterviewKitPrompt = ai.definePrompt({
  name: 'customizeInterviewKitPrompt',
  input: {schema: CustomizeInterviewKitInputSchema},
  output: {schema: CustomizeInterviewKitOutputSchema},
  prompt: `You are a highly experienced hiring manager and recruiter with 25 years of experience, specializing in refining interview kits for various roles, ensuring they are usable by recruiters who may not be technical experts. You will be given an interview kit previously generated. This kit was based on a Job Description, and potentially a Candidate Resume/Profile (detailing projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences) and/or Candidate Experience Context. The kit includes questions, model answers, competency importance, question categories, difficulty levels, and estimated times. The hiring manager (the user) has made edits to this kit. Your task is to review these edits and refine the entire kit.
CRITICAL: Before refining any content, take the time to thoroughly analyze and synthesize ALL provided details: the Job Description (primary source), the Candidate Resume/Profile (primary source if provided, analyze it deeply including specific projects, their tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), any Candidate Experience Context, AND the user's edits. Ensure the refined kit remains highly contextual and tailored based on all original inputs AND the user's explicit edits. Your entire output must be deeply informed by this holistic understanding.

Job Description (Primary Source, for context):
{{{jobDescription}}}

{{#if candidateResume}}
Candidate Resume/Profile Data (Primary Source, for context and primary reference, including projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences):
{{{candidateResume}}}
{{/if}}

{{#if candidateExperienceContext}}
Candidate Experience Context (additional notes on candidate's background, e.g., years of experience, current role, past tech stack, for context, to supplement primary sources):
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

Based on the recruiter's modifications and a holistic understanding of the original Job Description, Candidate Resume/Profile (as a key reference, including projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), and Candidate Experience Context:
1.  Preserve all existing IDs for competencies and questions.
2.  If the recruiter modified a question's text or model answer, ensure the updated content remains high quality, insightful, and relevant to the JD and candidate profile (resume/projects/education/context).
    *   Model answers MUST be FROM THE RECRUITER'S PERSPECTIVE, 3-4 concise bullet points, outlining KEY POINTS A CANDIDATE SHOULD COVER for a strong answer, making it easy for a non-technical recruiter to judge. They should be generic enough to cover fundamental concepts yet EXPLICITLY reference specific terms, skills, projects, or experiences from the Job Description AND/OR Candidate Resume/Profile (reflecting candidate's work and past experiences, including specific project details like tech stack, goals, accomplishments, challenges, educational background, academic achievements). Include notes for the interviewer regarding real-life examples if appropriate.
    *   The candidate's resume/profile (including projects, past work experiences, educational background, academic achievements) should be a key reference for validating and refining model answers.
    *   For "Tell me about yourself," the model answer should continue to guide the interviewer on what points a strong candidate, based on their resume/profile (including education and academic achievements), would cover, written from the interviewer's perspective.
    If a question seems significantly altered, subtly improve it respecting recruiter's intent, maintaining contextual links (especially to the resume/projects/education and their details like tech stack, goals, accomplishments, challenges), and ensuring the model answer format (recruiter's perspective, key points to cover).
3.  Reflect changes to competency importance, question category ('Technical'/'Non-Technical'), question difficulty (5 levels), or estimated times. Ensure difficulty is one of the 5 allowed levels. If new questions are implicitly added, assign appropriate category, difficulty, estimated time, and ensure well-formed questions with concise model answers (recruiter's perspective, strong points to cover) strongly tied to the JD and candidate profile.
4.  If rubric criteria names or weights were changed, reflect these. Ensure criteria names are high-quality, well-defined, distinct evaluation parameters, usable by non-technical recruiters (e.g., focusing on clarity, relevance, depth), contextually relevant, EXPLICITLY referencing key phrases from the JD, Candidate Resume/Profile (including specific projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, or past work experiences). Ensure rubric weights for all criteria sum to 1.0. Adjust logically if they do not.
5.  **Question Sequencing**: Aim to preserve or guide towards a logical question sequence if edits allow: general introduction, then background/academic/experience, then specific project/technical questions.
6.  Ensure all output fields (importance, category, difficulty, estimatedTimeMinutes, model answers from recruiter's perspective covering key points and referencing JD/resume/profile) are present for all competencies and questions.

Return the fully customized and refined interview kit in the specified JSON format. The goal is a polished, consistent, and high-quality interview kit that intelligently incorporates the recruiter's edits and adheres to all formatting and contextual requirements based on the JD, resume/profile (including projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), and any other candidate context, making it highly usable for non-technical recruiters.
`,
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
          text: q.text || "Missing question text. AI should refine this.",
          modelAnswer: q.modelAnswer || "Missing model answer. AI should provide guidance from a recruiter's perspective on key points the candidate should cover, informed by JD/resume/profile/context. For 'Tell me about yourself', it should guide on what a candidate should cover from their resume/profile.",
        })),
      })),
      rubricCriteria: output.rubricCriteria.map(rc => ({
          ...rc,
          name: rc.name || "Unnamed Criterion (must be well-defined, distinct, high-quality, actionable, measurable, and contextually reference JD/resume/profile for comprehensive evaluation by a non-technical recruiter). AI should refine this.",
          weight: typeof rc.weight === 'number' ? Math.max(0, Math.min(1, rc.weight)) : 0.2,
      }))
    };

    let totalWeight = validatedOutput.rubricCriteria.reduce((sum, crit) => sum + crit.weight, 0);
    if (validatedOutput.rubricCriteria.length > 0) {
        if (totalWeight === 0) {
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
        } else if (Math.abs(totalWeight - 1.0) > 0.001) {
            const factor = 1.0 / totalWeight;
            let sumOfNormalizedWeights = 0;
            validatedOutput.rubricCriteria.forEach((crit, index, arr) => {
                if (index < arr.length -1) {
                    crit.weight = parseFloat((crit.weight * factor).toFixed(2));
                    sumOfNormalizedWeights += crit.weight;
                } else {
                    crit.weight = parseFloat(Math.max(0, (1.0 - sumOfNormalizedWeights)).toFixed(2));
                }
            });
        }
    }
    let finalSum = validatedOutput.rubricCriteria.reduce((sum, crit) => sum + crit.weight, 0);
    if (Math.abs(finalSum - 1.0) > 0.001 && validatedOutput.rubricCriteria.length > 0) {
        const lastCrit = validatedOutput.rubricCriteria[validatedOutput.rubricCriteria.length-1];
        const diff = parseFloat((1.0 - finalSum).toFixed(2));
        lastCrit.weight = parseFloat(Math.max(0, lastCrit.weight + diff).toFixed(2));
        if (lastCrit.weight < 0) {
            lastCrit.weight = 0;
            let currentTotal = validatedOutput.rubricCriteria.reduce((s,c) => s + c.weight, 0);
             if (Math.abs(currentTotal - 1.0) > 0.001 && validatedOutput.rubricCriteria.length > 1) {
                 const remainingDiff = parseFloat((1.0 - currentTotal).toFixed(2));
                 let targetCrit = validatedOutput.rubricCriteria.find(c => c !== lastCrit && c.weight > 0) || validatedOutput.rubricCriteria.find(c => c !== lastCrit);
                 if (targetCrit) {
                     targetCrit.weight = parseFloat(Math.max(0, targetCrit.weight + remainingDiff).toFixed(2));
                 } else if (validatedOutput.rubricCriteria.length > 0) {
                    validatedOutput.rubricCriteria[0].weight = 1.0;
                 }
            }
        }
        finalSum = validatedOutput.rubricCriteria.reduce((sum, crit) => sum + crit.weight, 0);
        if (Math.abs(finalSum - 1.0) > 0.001 && validatedOutput.rubricCriteria.length > 0) {
            const finalDiff = parseFloat((1.0 - finalSum).toFixed(2));
            let targetCrit = validatedOutput.rubricCriteria.reduce((prev, current) => (prev.weight > current.weight) ? prev : current, validatedOutput.rubricCriteria[0]);
            targetCrit.weight = parseFloat(Math.max(0, targetCrit.weight + finalDiff).toFixed(2));
        }
    }
    return validatedOutput;
  }
);
    