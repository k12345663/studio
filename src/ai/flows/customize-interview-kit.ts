'use server';

/**
 * @fileOverview This file defines an OpenAI-based flow for customizing an interview kit.
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

import { createChatCompletion, createSystemMessage, createUserMessage, createUserMessageWithImage, type OpenAIMessage } from '@/lib/openai';
import { z } from 'zod';
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
  candidateExperienceContext: z.string().optional().describe('Optional brief context about the target candidate's experience that was used and should be considered for refinements. This supplements primary sources.'),
  competencies: z.array(CompetencySchema).describe('Array of core competencies, potentially with importance, questions with category, difficulty/time. User edits are reflected here. May include "Tell me about yourself". Competencies should be informed by the holistic analysis of JD and candidate profile.'),
  rubricCriteria: z.array(RubricCriterionSchema).describe('Array of rubric criteria with weights. User edits are reflected here.'),
});
export type CustomizeInterviewKitInput = z.infer<typeof CustomizeInterviewKitInputSchema>;

const CustomizeInterviewKitOutputSchema = z.object({
  competencies: z.array(CompetencySchema).describe("Array of customized core competencies, including importance, and questions with category, difficulty/time. Questions and answers should be high-quality. Model answers should be a structured array of checkable points. All answers must guide on evaluating relevant details not on the resume and rewarding practical, original insights."),
  rubricCriteria: z.array(RubricCriterionSchema).describe("Array of customized rubric criteria with weights. Ensure weights sum to 1.0 and criteria are well-defined, actionable, measurable, and reference JD/candidate profile for a contextual evaluation usable by non-technical recruiters, accounting for emergent candidate information."),
});
export type CustomizeInterviewKitOutput = z.infer<typeof CustomizeInterviewKitOutputSchema>;

const SYSTEM_PROMPT = `You are "Insight-Pro," an expert AI Recruitment Analyst. Your primary function is to refine an existing, user-edited interview kit. Your goal is to ensure the user's edits are logically consistent with the deep context of the candidate's profile versus the job description, and to enhance the kit's strategic value by ensuring every component remains sharp and strategically targeted.

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
- **Enhance, Don't Just Accept:** Do not blindly accept user edits if they create a logical inconsistency. If a user's edit makes a question too generic, you MUST refine it to be specific again, referencing a detail from the original resume or JD. If a user deletes a question probing a critical tech stack mismatch you detected, you should refine another question to cover that topic.
- **Refine Content with Depth:**
    - **Competencies & Questions:** Ensure competency names and question texts remain sharp, conversational, and deeply relevant after user edits. A question should not be generic; it MUST tie back to a specific project, skill, or transition from the resume. For example, if a user changes a question to "Tell me about your experience," you should refine it back to "Can you elaborate on your experience with the payment gateway integration you mentioned on the 'Project Apollo' section of your resume?"
    - **Model Answers:** All model answers (new or edited) must adhere to the structured format. The points within must remain context-specific, guiding the interviewer on what to listen for based on the candidate's actual profile.
    - **Scoring Rubric:** Ensure rubric criteria remain flexible, actionable, and directly reflect your deep analysis. For example, if a key skill from the JD is missing, a criterion must be specific, like 'Assessing Transferable Skills for [Missing Skill]'. Do not accept generic criteria.

You must respond with a valid JSON object that matches the required schema. Do not include any text outside the JSON response.`;

function buildUserPrompt(input: CustomizeInterviewKitInput): string {
  let prompt = `**Inputs for Analysis:**

Job Description (Primary Source, for context):
${input.jobDescription}

Unstop Profile Link (for context only):
${input.unstopProfileLink || 'Not provided'}`;

  if (input.unstopProfileDetails) {
    prompt += `\n\nUnstop Profile Details (Primary Source for Analysis):
${input.unstopProfileDetails}`;
  }

  if (input.candidateResumeDataUri) {
    prompt += `\n\nCandidate Resume File (${input.candidateResumeFileName}):
The resume content will be provided as an image. You must perform a word-for-word deep analysis of this resume content to inform your refinements.`;
  } else {
    prompt += `\n\nNo candidate resume file was provided for initial generation.`;
  }

  if (input.candidateExperienceContext) {
    prompt += `\n\nCandidate Experience Context (additional notes on candidate's background):
${input.candidateExperienceContext}`;
  }

  prompt += `\n\nRecruiter's Edited Interview Kit:
Competencies and Questions:`;

  input.competencies.forEach((comp, index) => {
    prompt += `\n- Competency Name: "${comp.name}" (ID: ${comp.id})`;
    if (comp.importance) {
      prompt += `\n  Importance: ${comp.importance}`;
    }
    prompt += `\n  Questions:`;
    comp.questions.forEach((q, qIndex) => {
      prompt += `\n  - Type: ${q.type}, Category: ${q.category}, Text: "${q.text}", (ID: ${q.id})`;
      prompt += `\n    Model Answer Points:`;
      q.modelAnswerPoints.forEach((point, pIndex) => {
        prompt += `\n    - Text: "${point.text}", Points: ${point.points}`;
      });
      if (q.difficulty) {
        prompt += `\n    Difficulty: ${q.difficulty}`;
      }
      if (q.estimatedTimeMinutes) {
        prompt += `\n    Estimated Time: ${q.estimatedTimeMinutes} min`;
      }
    });
  });

  prompt += `\n\nRubric Criteria:`;
  input.rubricCriteria.forEach((crit, index) => {
    prompt += `\n- Name: "${crit.name}", Weight: ${crit.weight}`;
  });

  prompt += `\n\nBased on the recruiter's modifications and a holistic, word-for-word deep analysis of all original inputs, refine the entire interview kit. Preserve all existing IDs. Ensure all output fields are present. The goal is a polished, consistent, and high-quality interview kit that intelligently incorporates the recruiter's edits and adheres to all formatting and contextual requirements, making it **highly usable for non-technical recruiters** and adaptable to information shared during the interview.

Respond with a valid JSON object that matches the required schema.`;

  return prompt;
}

export async function customizeInterviewKit(input: CustomizeInterviewKitInput): Promise<CustomizeInterviewKitOutput> {
  try {
    const messages: OpenAIMessage[] = [
      createSystemMessage(SYSTEM_PROMPT),
    ];

    const userPrompt = buildUserPrompt(input);

    if (input.candidateResumeDataUri) {
      // Include resume image in the message
      messages.push(createUserMessageWithImage(userPrompt, input.candidateResumeDataUri));
    } else {
      messages.push(createUserMessage(userPrompt));
    }

    const response = await createChatCompletion(messages, {
      temperature: 0.7,
      maxTokens: 4000,
      responseFormat: { type: 'json_object' },
    });

    if (!response) {
      throw new Error("OpenAI API returned empty response");
    }

    let parsedOutput;
    try {
      parsedOutput = JSON.parse(response);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', response);
      throw new Error("OpenAI API returned invalid JSON");
    }

    // Validate the output against our schema
    const validatedOutput = CustomizeInterviewKitOutputSchema.parse(parsedOutput);

    // Apply post-processing similar to the original implementation
    const processedOutput = {
      ...validatedOutput,
      competencies: validatedOutput.competencies.map(comp => ({
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
      rubricCriteria: validatedOutput.rubricCriteria.map(rc => ({
        ...rc,
        name: rc.name || "Unnamed Criterion (must be well-defined, distinct, high-quality, actionable, measurable, contextually reference JD/Unstop Profile/Resume File Content, considering emergent details, for comprehensive evaluation by a non-technical recruiter). AI should refine this.",
        weight: typeof rc.weight === 'number' ? Math.max(0, Math.min(1, rc.weight)) : 0.2,
      }))
    };

    // Normalize rubric weights to sum to 1.0
    normalizeRubricWeights(processedOutput.rubricCriteria);

    return processedOutput;
  } catch (error) {
    console.error("Error customizing interview kit:", error);
    throw new Error(`Failed to customize interview kit: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function normalizeRubricWeights(rubric: Array<{ weight: number }>) {
  if (rubric.length === 0) return;

  let totalWeight = rubric.reduce((sum, crit) => sum + crit.weight, 0);
  
  if (totalWeight === 0) {
    // If all weights are 0, distribute equally
    const equalWeight = parseFloat((1.0 / rubric.length).toFixed(2));
    let sum = 0;
    rubric.forEach((crit, index, arr) => {
      if (index < arr.length - 1) {
        crit.weight = equalWeight;
        sum += equalWeight;
      } else {
        crit.weight = parseFloat(Math.max(0, (1.0 - sum)).toFixed(2));
      }
    });
  } else if (Math.abs(totalWeight - 1.0) > 0.001) {
    // Normalize weights to sum to 1.0
    const factor = 1.0 / totalWeight;
    let sumOfNormalizedWeights = 0;
    rubric.forEach((crit, index, arr) => {
      if (index < arr.length - 1) {
        const normalized = Math.max(0, crit.weight * factor);
        crit.weight = parseFloat(normalized.toFixed(2));
        sumOfNormalizedWeights += crit.weight;
      } else {
        // Last element gets the remainder to ensure sum is exactly 1.0
        crit.weight = parseFloat(Math.max(0, (1.0 - sumOfNormalizedWeights)).toFixed(2));
      }
    });
  }
}