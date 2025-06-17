
'use server';

/**
 * @fileOverview This file defines a Genkit flow for customizing an interview kit.
 *
 * It allows recruiters to tweak question wording, re-weight scoring criteria, and regenerate questions.
 * It emphasizes a recruiter-centric approach, especially for non-technical evaluators,
 * focusing on generic yet pillar-covering answers and guidance on real-life examples.
 * It aims to maintain a logical question flow and deep engagement with JD, Unstop profile link, and candidate resume text.
 * It also guides the AI to consider information shared by the candidate during the interview that might not be on the resume.
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
  text: z.string().describe('The text of the question. Ensure it is insightful and specific, considering JD, Unstop Profile (compulsory input, conceptually treat as if analyzing the live profile) and Candidate Resume Text (optional input, treated as full text from PDF/DOC, including projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, past work experiences & context).'),
  modelAnswer: z.string().describe("A model answer from the INTERVIEWER'S PERSPECTIVE, presented as 3-4 concise bullet points. Each bullet MUST outline KEY POINTS A CANDIDATE SHOULD COVER for a strong answer, making it exceptionally easy for a non-technical recruiter to judge. Furthermore, each bullet point MUST also include a textual suggestion of its indicative weight or contribution (e.g., 'approx. 2-3 points', 'around 4 points') towards the question's total 10-point score, using whole numbers or small, clear ranges of whole numbers. For example, a bullet point could be followed by guidance like '(This point is crucial and could account for approx. 3-4 points of the total 10)' or '(Covers a foundational aspect, contributing roughly 2-3 points)'. This textual guidance is to help the panelist understand the relative importance of each point when they assign their overall 1-10 score for the question using the slider. The collective indicative contributions for all bullet points should paint a clear picture of what constitutes a strong, comprehensive answer that would merit a high score, conceptually aligning towards the 10-point maximum if all aspects are well addressed. These points should serve as general examples of strong answers, reflecting core concepts (e.g., if OOP is asked, the answer should guide the recruiter to check for the 4 pillars: Abstraction, Encapsulation, Inheritance, Polymorphism, clearly listing them). While generally informed by the overall context (Job Description, candidate profile including Unstop link, resume text [treated as full text from PDF/DOC], projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), for many general questions, the key points should strongly emphasize fundamental concepts or general best practices for answering, rather than requiring every point to be explicitly tied to a specific line in the Job Description. The goal is to provide a solid baseline for evaluation. Answers must be basic, clear, and easy for a non-technical recruiter to evaluate. EXPLICITLY reference key terms, skills, projects, or experiences from the Job Description AND/OR the Candidate's Unstop Profile/Resume Text when crucial for context. Include guidance on evaluating real-life examples and relevant information shared by the candidate not present on the resume using a note like: 'Note: If the candidate provides relevant real-life examples or discusses experiences/skills not detailed on their resume/profile but clearly relevant to the role, this can indicate greater depth, initiative, or broader experience. The interviewer should assess the relevance and substance of such unstated information against the job requirements.' For the \"Tell me about yourself\" question: the model answer should continue to be a guide for the INTERVIEWER. It should outline key points from the candidate's specific background (such as their name, key qualifications, relevant educational background, academic achievements, significant projects from Unstop/resume, and notable work history) that would constitute a strong, relevant, and well-structured introduction. This model answer must be written from the interviewer's perspective to help a non-technical recruiter assess relevance and completeness against the candidate's documented profile, rather than being a script for the candidate."),
  difficulty: z.enum(['Naive', 'Beginner', 'Intermediate', 'Expert', 'Master']).optional().describe("The difficulty level of the question (5-point scale)."),
  estimatedTimeMinutes: z.number().optional().describe('Suitable estimated time in minutes to answer this question.'),
});

const CompetencySchema = z.object({
  id: z.string().describe('Unique identifier for the competency.'),
  name: z.string().describe('Name of the competency.'),
  importance: z.enum(['High', 'Medium', 'Low']).optional().describe('The importance of this competency for the role.'),
  questions: z.array(QuestionSchema).describe('Array of questions for the competency. Ensure questions and answers maintain high quality if modified or regenerated, referencing JD and candidate profile (Unstop Profile Link - compulsory, conceptually treat as if analyzing the live profile, and especially the Resume Text - optional, treated as full text from PDF/DOC, including projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences). Try to maintain a logical sequence of questions within competencies if edits allow.'),
});

const RubricCriterionSchema = z.object({
  name: z.string().describe("Name of the well-defined, distinct, and high-quality criterion, framed for easy use by a non-technical recruiter. It must be actionable, measurable, and directly relevant to assessing candidate suitability. Focus on parameters like 'Clarity of Explanation', 'Relevance of Answer', 'Depth of Understanding (considering resume details [treated as full text from PDF/DOC] and relevant emergent information shared by candidate)'. Each criterion MUST explicitly mention key phrases, skills, concepts, project types, or relevant academic achievements from the Job Description AND/OR the Candidate's Unstop Profile/Resume Text (including specific projects, their tech stack, goals, accomplishments, challenges, educational background, academic achievements, or past work experiences) where appropriate. The set of criteria should provide a broad yet deeply contextual basis for evaluating the candidate comprehensively, understandable by someone not expert in the role's domain."),
  weight: z.number().describe('Weight of the criterion (a value between 0.0 and 1.0, should sum to 1.0 across all criteria).'),
});

const CustomizeInterviewKitInputSchema = z.object({
  jobDescription: z.string().describe('The job description used to generate the interview kit. This is a primary source material.'),
  unstopProfileLink: z.string().optional().describe("The candidate's Unstop profile link (compulsory input). This is a primary source material if provided; AI should (conceptually) treat this as if accessing and deeply analyzing the candidate's entire live profile if it was used and should be considered for refinements."),
  candidateResumeText: z.string().optional().describe("The full text conceptually extracted from the candidate's complete resume document (e.g., from an uploaded PDF/DOC or pasted text) that was used and should be considered for refinements. This is a key reference document for tailoring, including specific projects mentioned (their tech stack, goals, accomplishments, challenges), educational background, academic achievements, and past work experiences. Analyze it deeply as if reading the original document if provided."),
  candidateExperienceContext: z.string().optional().describe('Optional brief context about the target candidate’s experience that was used and should be considered for refinements. This supplements primary sources.'),
  competencies: z.array(CompetencySchema).describe('Array of core competencies, potentially with importance, questions with category, difficulty/time. User edits are reflected here. May include "Tell me about yourself". Competencies should be informed by the holistic analysis of JD and candidate profile (Unstop Profile/Resume text including educational background and academic achievements).'),
  rubricCriteria: z.array(RubricCriterionSchema).describe('Array of rubric criteria with weights. User edits are reflected here.'),
});
export type CustomizeInterviewKitInput = z.infer<typeof CustomizeInterviewKitInputSchema>;

const CustomizeInterviewKitOutputSchema = z.object({
  competencies: z.array(CompetencySchema).describe("Array of customized core competencies, including importance, and questions with category, difficulty/time. Quality of questions and answers should be maintained or enhanced, with answers from an interviewer's perspective (3-4 bullet points highlighting key points to cover, each with indicative contribution to score using whole numbers or small ranges of whole numbers, basic, clear, and easy for a non-technical recruiter to judge, and where the collective contributions conceptually align with a full 10-point answer) referencing JD and candidate profile (Unstop Profile/Resume Text [treated as full text from PDF/DOC] including projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, past work experiences & context, and how to evaluate relevant details not on resume). For 'Tell me about yourself', model answers should remain interviewer-focused guides based on the Unstop Profile/Resume text (including candidate's work history, projects, education, academic achievements), ensuring a non-technical recruiter can assess relevance. Questions should aim for a logical flow where appropriate."),
  rubricCriteria: z.array(RubricCriterionSchema).describe("Array of customized rubric criteria with weights. Ensure weights sum to 1.0 and criteria are well-defined, distinct, high-quality, actionable, measurable, and reference JD and candidate profile (Unstop Profile/Resume Text [treated as full text from PDF/DOC] including projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, past work experiences & context, and considering relevant emergent candidate information) for a broad yet deeply contextual evaluation usable by non-technical recruiters. Focus on parameters like 'Clarity', 'Relevance', 'Depth'."),
});
export type CustomizeInterviewKitOutput = z.infer<typeof CustomizeInterviewKitOutputSchema>;

export async function customizeInterviewKit(input: CustomizeInterviewKitInput): Promise<CustomizeInterviewKitOutput> {
  return customizeInterviewKitFlow(input);
}

const customizeInterviewKitPrompt = ai.definePrompt({
  name: 'customizeInterviewKitPrompt',
  input: {schema: CustomizeInterviewKitInputSchema},
  output: {schema: CustomizeInterviewKitOutputSchema},
  prompt: `You are a highly experienced hiring manager and recruiter with 25 years of experience, acting as a supportive **recruiter companion**. Your primary goal is to refine interview kits to empower recruiters, **especially those who may not be technical experts in the role's domain** (e.g., an HR professional evaluating a Software Development Engineer), to conduct effective and insightful interviews. You will be given an interview kit previously generated. This kit was based on a Job Description, an Unstop Profile Link (compulsory), and potentially Candidate Resume Text (optional, detailing projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), and/or Candidate Experience Context. The kit includes questions, model answers, competency importance, question categories, difficulty levels, and estimated times. The hiring manager (the user) has made edits to this kit. Your task is to review these edits and refine the entire kit.
CRITICAL: Before refining any content, take the time to **thoroughly analyze and synthesize ALL provided details**: the Job Description (primary source), the Unstop Profile Link (primary source - COMPULSORY, **conceptually treat this as if you are accessing and deeply analyzing the candidate's entire live profile**), the Candidate Resume Text (primary source - OPTIONAL, if provided, this is the **full text conceptually extracted from the candidate's complete resume document (e.g., PDF/DOC)**. Analyze it deeply as if reading the original document, including specific projects, their tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), any Candidate Experience Context, AND the user's edits. Ensure the refined kit remains highly contextual and tailored based on all original inputs AND the user's explicit edits. Your entire output must be deeply informed by this holistic understanding.

Job Description (Primary Source, for context):
{{{jobDescription}}}

Unstop Profile Link (Primary Source - COMPULSORY, for context and primary reference; **conceptually treat as if accessing and deeply analyzing the live profile**):
{{{unstopProfileLink}}}

{{#if candidateResumeText}}
Candidate Resume Text (Primary Source - OPTIONAL, for context and primary reference, **treated as full text conceptually extracted from PDF/DOC**, including projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences):
{{{candidateResumeText}}}
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

Based on the recruiter's modifications and a holistic understanding of the original Job Description, Unstop Profile Link (as a key reference, **conceptually treat as if analyzing live profile content**), Candidate Resume Text (as a key reference, **treated as full text from PDF/DOC**, including projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), and Candidate Experience Context:
1.  Preserve all existing IDs for competencies and questions.
2.  If the recruiter modified a question's text or model answer, ensure the updated content remains high quality, insightful, and relevant to the JD and candidate profile (Unstop Profile/Resume Text/projects/education/context).
    *   Model answers MUST be FROM THE INTERVIEWER'S PERSPECTIVE, 3-4 concise bullet points, outlining KEY POINTS A CANDIDATE SHOULD COVER for a strong answer, making it **exceptionally easy for a non-technical recruiter to judge**. Furthermore, each bullet point MUST also include a textual suggestion of its indicative weight or contribution (e.g., 'approx. 2-3 points', 'around 4 points') towards the question's total 10-point score, using whole numbers or small, clear ranges of whole numbers. For example, a bullet point could be followed by guidance like '(This point is crucial and could account for approx. 3-4 points of the total 10)' or '(Covers a foundational aspect, contributing roughly 2-3 points)'. This textual guidance is to help the panelist understand the relative importance of each point when they assign their overall 1-10 score for the question using the slider. The collective indicative contributions for all bullet points should paint a clear picture of what constitutes a strong, comprehensive answer that would merit a high score, conceptually aligning towards the 10-point maximum if all aspects are well addressed. They should serve as **general examples of strong answers**, reflecting core concepts (e.g., if OOP is asked, the answer should guide the recruiter to check for the 4 pillars: Abstraction, Encapsulation, Inheritance, Polymorphism, clearly listing them). While generally informed by the overall context (Job Description, candidate profile including Unstop link, resume text [treated as full text from PDF/DOC], projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), **for many general questions, the key points should strongly emphasize fundamental concepts or general best practices for answering, rather than requiring every point to be explicitly tied to a specific line in the Job Description. The goal is to provide a solid baseline for evaluation.** Answers must be **basic, clear, and easy for a non-technical recruiter to evaluate**. EXPLICITLY reference key terms, skills, projects, or experiences from the Job Description AND/OR Candidate's Unstop Profile/Resume Text when crucial for context. Include guidance on evaluating real-life examples and relevant information shared by the candidate not present on the resume using a note like: 'Note: If the candidate provides relevant real-life examples or discusses experiences/skills not detailed on their resume/profile but clearly relevant to the role, this can indicate greater depth, initiative, or broader experience. The interviewer should assess the relevance and substance of such unstated information against the job requirements.'
    *   The candidate's Unstop Profile/Resume Text (including projects, past work experiences, educational background, academic achievements) should be a key reference for validating and refining model answers. Answers must be **basic, clear, and easy for a non-technical recruiter to evaluate.**
    *   For the "Tell me about yourself" question: the model answer should continue to be a guide for the INTERVIEWER. It should outline key points from the candidate's specific background (such as their name, key qualifications, relevant educational background, academic achievements, significant projects from Unstop/resume, and notable work history) that would constitute a strong, relevant, and well-structured introduction. This model answer must be written from the interviewer's perspective to help a non-technical recruiter assess relevance and completeness against the candidate's documented profile, rather than being a script for the candidate.
    If a question seems significantly altered, subtly improve it respecting recruiter's intent, maintaining contextual links (especially to the Unstop profile/resume projects/education and their details like tech stack, goals, accomplishments, challenges), and ensuring the model answer format (interviewer's perspective, key points to cover, each with indicative score contribution using whole numbers or small clear ranges of whole numbers, **simple and clear for non-technical evaluation**, collective contributions conceptually aligning to a full 10-point answer).
3.  Reflect changes to competency importance, question category ('Technical'/'Non-Technical'), question difficulty (5 levels), or estimated times. Ensure difficulty is one of the 5 allowed levels. If new questions are implicitly added, assign appropriate category, difficulty, estimated time, and ensure well-formed questions with concise model answers (interviewer's perspective, strong points to cover with indicative score contribution using whole numbers or small clear ranges of whole numbers, **simple and clear for non-technical evaluation**, collective contributions conceptually aligning to a full 10-point answer) strongly tied to the JD and candidate profile (Unstop/Resume).
4.  If rubric criteria names or weights were changed, reflect these. Ensure criteria names are high-quality, well-defined, distinct evaluation parameters, **usable by non-technical recruiters** (e.g., focusing on clarity, relevance, depth), contextually relevant, EXPLICITLY referencing key phrases from the JD, Candidate's Unstop Profile/Resume Text (treated as full text from PDF/DOC, including specific projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, or past work experiences, and accounting for relevant emergent information). Ensure rubric weights for all criteria sum to 1.0. Adjust logically if they do not.
5.  **Question Sequencing**: Aim to preserve or guide towards a logical question sequence if edits allow: general introduction, then background/academic/experience, then specific project/technical questions.
6.  Ensure all output fields (importance, category, difficulty, estimatedTimeMinutes, model answers from interviewer's perspective covering key points with indicative score contributions using whole numbers or small clear ranges of whole numbers and referencing JD/Unstop Profile/Resume Text [treated as full text from PDF/DOC] and considering emergent details, collective contributions conceptually aligning to a full 10-point answer, **simple and clear for non-technical evaluation**) are present for all competencies and questions.

Return the fully customized and refined interview kit in the specified JSON format. The goal is a polished, consistent, and high-quality interview kit that intelligently incorporates the recruiter's edits and adheres to all formatting and contextual requirements based on the JD, Unstop Profile Link (**conceptually treated as live profile**), Candidate Resume Text (**treated as full text from PDF/DOC**, including projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), and any other candidate context, making it **highly usable for non-technical recruiters** and adaptable to information shared during the interview.
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
          text: q.text || "Missing question text. AI should refine this based on JD/Unstop Profile/Resume Text.",
          modelAnswer: q.modelAnswer || "Missing model answer. AI should provide guidance from an interviewer's perspective on key points the candidate should cover (each with indicative contribution to score using whole numbers or small ranges, conceptually summing to 10 if all covered), informed by JD/Unstop Profile/Resume Text/context (and how to evaluate relevant emergent details), making it easy for a non-technical recruiter to judge. For 'Tell me about yourself', it should guide on what a candidate with this specific Unstop/Resume background should cover to help a non-technical recruiter assess relevance.",
        })),
      })),
      rubricCriteria: output.rubricCriteria.map(rc => ({
          ...rc,
          name: rc.name || "Unnamed Criterion (must be well-defined, distinct, high-quality, actionable, measurable, contextually reference JD/Unstop Profile/Resume Text, considering emergent details, for comprehensive evaluation by a non-technical recruiter, and be usable by someone not expert in the role's domain). AI should refine this.",
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
         if (lastCrit.weight < 0) { // Should not happen with Math.max(0, ...) but as a safeguard
            lastCrit.weight = 0;
             // Attempt to re-distribute remaining weight if last item became 0 and total is still not 1
            let currentTotal = validatedOutput.rubricCriteria.reduce((s,c) => s + c.weight, 0);
            if (Math.abs(currentTotal - 1.0) > 0.001 && validatedOutput.rubricCriteria.length > 1) {
                 const remainingDiff = parseFloat((1.0 - currentTotal).toFixed(2));
                 let targetCrit = validatedOutput.rubricCriteria.find(c => c !== lastCrit && c.weight > 0) || validatedOutput.rubricCriteria.find(c => c !== lastCrit); // find a criterion to adjust
                 if(targetCrit) {
                    targetCrit.weight = parseFloat(Math.max(0, targetCrit.weight + remainingDiff).toFixed(2));
                 }  else if (validatedOutput.rubricCriteria.length > 0){
                    validatedOutput.rubricCriteria[0].weight = 1.0; // Fallback: assign all to first if others are zero
                 }
            }
        }
        // Final check to assign any tiny rounding errors to the largest weighted item or first item
        finalSum = validatedOutput.rubricCriteria.reduce((sum, crit) => sum + crit.weight, 0);
        if (Math.abs(finalSum - 1.0) > 0.001 && validatedOutput.rubricCriteria.length > 0) {
            const finalDiffToAdjust = parseFloat((1.0-finalSum).toFixed(2));
            let targetCrit = validatedOutput.rubricCriteria.reduce((prev, current) => (prev.weight > current.weight) ? prev : current, validatedOutput.rubricCriteria[0]);
            targetCrit.weight = parseFloat(Math.max(0, targetCrit.weight + finalDiffToAdjust).toFixed(2));
        }
    }
    return validatedOutput;
  }
);

    
