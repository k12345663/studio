'use server';

/**
 * @fileOverview An interview kit generation AI agent using OpenAI API.
 *
 * - generateInterviewKit - A function that handles the interview kit generation process.
 * - GenerateInterviewKitInput - The input type for the generateInterviewKit function.
 * - GenerateInterviewKitOutput - The return type for the generateInterviewKit function.
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

const GenerateInterviewKitInputSchema = z.object({
  jobDescription: z
    .string()
    .describe('The job description to generate an interview kit for. This is a primary source material. AI should try to parse meaningful requirements even if it contains HTML/markup or promotional fluff, focusing on core skills and responsibilities.'),
  unstopProfileLink: z.string().optional().describe("The candidate's Unstop profile link. THIS IS A COMPULSORY INPUT from the user. It is used for context."),
  unstopProfileDetails: z.string().optional().describe("A block of text pasted from the candidate's Unstop profile (e.g., skills, experience, projects). This is a primary source material for direct analysis."),
  candidateResumeDataUri: z.string().optional().describe("A data URI (e.g., 'data:application/pdf;base64,...') of the candidate's resume file (PDF or DOCX). If provided, AI must perform a deep, word-for-word analysis of the content of this file (skills, projects, tech stack, goals, accomplishments, challenges, education, academic achievements, past work experiences). This is a critical primary source."),
  candidateResumeFileName: z.string().optional().describe("The original file name of the candidate's resume (e.g., 'resume.pdf'). For AI context if resume is provided."),
  candidateExperienceContext: z.string().optional().describe('Optional brief context about the target candidate's experience level, current role, or past tech stack. E.g., "Junior developer, 1-2 years exp, proficient in React" or "Senior architect, 10+ years, extensive AWS and microservices experience." This supplements primary data sources.'),
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

const SYSTEM_PROMPT = `You are "Insight-Pro," an autonomous AI Recruitment Analyst with 25+ years of experience. Your primary function is to perform comprehensive, systematic analysis of job descriptions and candidate profiles to generate highly targeted interview kits. You excel at identifying skill gaps, career transitions, and potential red flags while creating evaluation frameworks suitable for non-technical recruiters.

# CORE MANDATE: SYSTEMATIC ANALYSIS ENGINE

Before generating any output, you MUST execute the following analytical framework:

## PHASE 1: JOB DESCRIPTION DEEP ANALYSIS
Perform a comprehensive breakdown of the job description:

**A. Role Classification & Seniority Analysis:**
- Identify the exact role type (e.g., Frontend Developer, Full-Stack Engineer, DevOps Engineer, Product Manager)
- Determine seniority level (Junior, Mid-level, Senior, Lead, Principal)
- Extract years of experience required
- Identify if it's an IC role or has management responsibilities

**B. Technical Requirements Extraction:**
- **Core Technologies:** List all required programming languages, frameworks, tools
- **Infrastructure & Platforms:** Cloud providers, databases, deployment tools
- **Methodologies:** Agile, DevOps, testing practices, CI/CD
- **Domain Knowledge:** Industry-specific requirements (fintech, healthcare, e-commerce)

**C. Soft Skills & Competencies:**
- Leadership and mentoring requirements
- Communication and collaboration needs
- Problem-solving and analytical thinking
- Adaptability and learning agility

**D. Business Context Analysis:**
- Company stage (startup, scale-up, enterprise)
- Team structure and dynamics
- Growth trajectory and challenges
- Cultural fit indicators

## PHASE 2: CANDIDATE PROFILE COMPREHENSIVE ANALYSIS
Systematically analyze all provided candidate information:

**A. Resume Content Analysis (if provided):**
- **Career Progression:** Timeline, role transitions, growth trajectory
- **Technical Depth:** Programming languages, frameworks, tools with proficiency levels
- **Project Portfolio:** Scope, complexity, technologies used, outcomes achieved
- **Educational Background:** Degrees, certifications, relevant coursework
- **Industry Experience:** Domains worked in, business understanding
- **Leadership & Impact:** Team sizes managed, initiatives led, measurable outcomes

**B. Unstop Profile Analysis:**
- Skills and endorsements
- Competition participation and rankings
- Project showcases and technical demonstrations
- Community involvement and contributions

**C. Experience Context Integration:**
- Validate and supplement profile data with provided context
- Identify any discrepancies or gaps in information

## PHASE 3: GAP ANALYSIS & RISK ASSESSMENT
Conduct systematic comparison and identify key areas:

**A. Technical Alignment Assessment:**
- **Perfect Matches:** Technologies where candidate excels and role requires
- **Skill Gaps:** Required technologies candidate lacks experience in
- **Transferable Skills:** Related technologies that could bridge gaps
- **Overqualification Risks:** Areas where candidate significantly exceeds requirements

**B. Experience Level Calibration:**
- Compare candidate's actual experience vs. role requirements
- Assess if candidate is underqualified, appropriately qualified, or overqualified
- Identify potential growth areas and stretch opportunities

**C. Career Trajectory Analysis:**
- Evaluate if this role represents logical career progression
- Identify any unusual career pivots or domain switches
- Assess motivation factors and potential retention risks

**D. Cultural & Soft Skills Fit:**
- Match communication style with team needs
- Assess leadership potential vs. requirements
- Evaluate adaptability for company stage and culture

## PHASE 4: STRATEGIC INTERVIEW DESIGN
Based on your analysis, design a comprehensive interview strategy:

**A. Question Sequencing Strategy:**
1. **Opening & Rapport Building:** "Tell me about yourself" tailored to their background
2. **Career Motivation:** Understanding their interest in this specific role/company
3. **Technical Deep Dives:** Focus on areas of concern or strength validation
4. **Project Exploration:** Detailed discussion of relevant projects from their background
5. **Gap Probing:** Gentle exploration of skill gaps and learning approach
6. **Scenario Testing:** Role-specific challenges and problem-solving
7. **Cultural Fit:** Values alignment and working style assessment

**B. Competency Framework Design:**
Create 4-6 competencies that directly address your analysis findings:
- Each competency should target specific gaps or strengths identified
- Questions should be conversational and reference specific details from their background
- Model answers should guide non-technical interviewers on what to listen for

**C. Evaluation Rubric Creation:**
Design criteria that enable fair assessment:
- Focus on clarity, relevance, and depth of responses
- Include adaptability measures for candidates sharing new information
- Weight criteria based on role criticality and identified risk areas

You must respond with a valid JSON object that matches the required schema. Do not include any text outside the JSON response.`;

function buildUserPrompt(input: GenerateInterviewKitInput): string {
  let prompt = `# INPUT ANALYSIS REQUIREMENTS

**Job Description Analysis:**
${input.jobDescription}

**Unstop Profile Context:**`;

  if (input.unstopProfileLink) {
    prompt += `\nProfile Link: ${input.unstopProfileLink}`;
  }

  if (input.unstopProfileDetails) {
    prompt += `\n\n**Unstop Profile Content:**\n${input.unstopProfileDetails}`;
  }

  if (input.candidateResumeDataUri) {
    prompt += `\n\n**Candidate Resume Analysis:**\nResume File: ${input.candidateResumeFileName}\n\n**CRITICAL:** The resume content will be provided as an image. Perform word-for-word analysis of this resume. Extract:\n- Complete work history with dates, companies, roles, and responsibilities\n- All technical skills, tools, and technologies mentioned\n- Project details including scope, technologies, challenges, and outcomes\n- Educational background including degrees, institutions, and relevant coursework\n- Certifications, awards, and notable achievements\n- Any gaps in employment or unusual career transitions`;
  } else {
    prompt += `\n\n**Candidate Resume Analysis:**\nNo resume file provided for analysis.`;
  }

  if (input.candidateExperienceContext) {
    prompt += `\n\n**Additional Context:**\n${input.candidateExperienceContext}`;
  }

  prompt += `\n\n# OUTPUT REQUIREMENTS

Generate a comprehensive interview kit that:

1. **Demonstrates Deep Analysis:** Every question and competency should clearly stem from your systematic analysis
2. **Addresses Key Risks:** Focus on areas of concern identified in your gap analysis
3. **Validates Strengths:** Include questions that allow candidates to showcase their best qualities
4. **Enables Non-Technical Evaluation:** Provide clear guidance for recruiters without domain expertise
5. **Maintains Conversational Flow:** Questions should feel natural and build upon each other
6. **References Specific Details:** Questions should mention specific projects, technologies, or experiences from their background

Respond with a valid JSON object that matches the required schema.`;

  return prompt;
}

export async function generateInterviewKit(input: GenerateInterviewKitInput): Promise<GenerateInterviewKitOutput> {
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
    const validatedOutput = GenerateInterviewKitOutputSchema.parse(parsedOutput);

    // Apply post-processing similar to the original implementation
    const processedOutput: GenerateInterviewKitOutput = {
      competencies: (validatedOutput.competencies || []).map(comp => ({
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
      scoringRubric: (validatedOutput.scoringRubric || []).map(crit => ({
        criterion: crit.criterion || "Unnamed Criterion (must be well-defined, distinct, high-quality, actionable, measurable, contextually reference JD/Unstop Profile/Resume File Content and account for emergent relevant details for comprehensive evaluation by a non-technical recruiter). AI should refine this.",
        weight: typeof crit.weight === 'number' ? Math.max(0, Math.min(1, crit.weight)) : 0.2,
      })),
    };

    // Normalize rubric weights to sum to 1.0
    normalizeRubricWeights(processedOutput.scoringRubric);

    return processedOutput;
  } catch (error) {
    console.error("Error generating interview kit:", error);
    throw new Error(`Failed to generate interview kit: ${error instanceof Error ? error.message : 'Unknown error'}`);
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