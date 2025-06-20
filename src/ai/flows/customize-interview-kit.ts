
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
  modelAnswer: z.string().describe("A model answer FOR THE INTERVIEWER'S USE, presented as 3-4 concise bullet points. **These bullet points for the recruiter MUST BE EXTREMELY BRIEF AND CRISP, ideally just ABSOLUTELY ESSENTIAL KEYWORDS or CRITICAL SHORT PHRASES, serving as a rapid mental checklist of core elements the candidate should ideally touch upon.** Each bullet point MUST outline KEY POINTS A CANDIDATE SHOULD COVER for a strong answer, making it **exceptionally easy for a non-technical recruiter to quickly assess**. Furthermore, each bullet point MUST also include a textual suggestion of its indicative weight or contribution (e.g., 'approx. 2-3 points', 'around 4 points') towards the question's total 10-point score, using whole numbers or small, clear ranges of whole numbers. For example, a bullet point could be: '- Core Concept X mentioned (approx. 3-4 points)'. The collective indicative contributions for all bullet points should paint a clear picture of what constitutes a strong, comprehensive answer that would merit a high score, conceptually aligning towards the 10-point maximum if all aspects are well addressed. **These points should serve as GENERAL EXAMPLES OF STRONG ANSWERS. For general technical or behavioral questions, they must reflect CORE CONCEPTS broken down into their most FUNDAMENTAL, EASILY DIGESTIBLE PARTS (e.g., if OOP is asked, the answer should guide the recruiter to check for: '1. Abstraction mentioned. 2. Encapsulation explained. 3. Inheritance example. 4. Polymorphism concept.', clearly listing these pillars).** While generally informed by the overall context (Job Description, candidate profile including Unstop link, resume file content [AI to analyze if provided], projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), for many general questions, the key points should strongly emphasize fundamental concepts or general best practices for answering, rather than requiring every point to be explicitly tied to a specific line in the Job Description. The goal is to provide a solid, SIMPLE baseline for evaluation. Answers must be BASIC, CLEAR, and easy for a non-technical recruiter to evaluate. EXPLICITLY reference key terms, skills, projects, or experiences from the Job Description AND/OR the Candidate's Unstop Profile/Resume File Content when crucial for context. Include guidance on evaluating real-life examples and relevant information shared by the candidate not present on the resume using a note like: 'Note: If the candidate provides relevant real-life examples or discusses experiences/skills not detailed on their resume/profile but clearly relevant to the role, this can indicate greater depth, initiative, or broader experience. The interviewer should assess the relevance and substance of such unstated information against the job requirements.' For the \"Tell me about yourself\" question: the model answer should continue to be a guide for the INTERVIEWER. It should outline key points from the candidate's specific background (such as their name, key qualifications, relevant educational background, academic achievements, significant projects from Unstop/resume file content, and notable work history) that would constitute a strong, relevant, and well-structured introduction. This model answer must be written from the interviewer's perspective to help a non-technical recruiter assess relevance and completeness against the candidate's documented profile, rather than being a script for the candidate."),
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
  competencies: z.array(CompetencySchema).describe('Array of core competencies, potentially with importance, questions with category, difficulty/time. User edits are reflected here. May include "Tell me about yourself". Competencies should be informed by the holistic analysis of JD and candidate profile (Unstop Profile/Resume file content including educational background and academic achievements).'),
  rubricCriteria: z.array(RubricCriterionSchema).describe('Array of rubric criteria with weights. User edits are reflected here.'),
});
export type CustomizeInterviewKitInput = z.infer<typeof CustomizeInterviewKitInputSchema>;

const CustomizeInterviewKitOutputSchema = z.object({
  competencies: z.array(CompetencySchema).describe("Array of customized core competencies, including importance, and questions with category, difficulty/time. Quality of questions and answers should be maintained or enhanced, with answers FOR THE INTERVIEWER'S USE (**EXTREMELY brief and crisp keywords/short phrases as key points**, each with indicative contribution to score using whole numbers or small clear ranges, collective contributions conceptually aligning to a full 10-point answer) referencing JD and candidate profile (Unstop Profile/Resume File Content [AI to analyze if provided] including projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, past work experiences & context, and how to evaluate relevant details not on resume). **Model answers for general questions must focus on FUNDAMENTAL concepts broken down SIMPLY for non-technical evaluation.** For 'Tell me about yourself', model answers should remain interviewer-focused guides based on the Unstop Profile/Resume file content (including candidate's work history, projects, education, academic achievements), ensuring a non-technical recruiter can assess relevance. Questions should aim for a logical flow where appropriate."),
  rubricCriteria: z.array(RubricCriterionSchema).describe("Array of customized rubric criteria with weights. Ensure weights sum to 1.0 and criteria are well-defined, distinct, high-quality, actionable, measurable, and reference JD and candidate profile (Unstop Profile/Resume File Content [AI to analyze if provided] including projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, past work experiences & context, and considering relevant emergent candidate information) for a broad yet deeply contextual evaluation usable by non-technical recruiters. Focus on parameters like 'Clarity', 'Relevance', 'Depth'."),
});
export type CustomizeInterviewKitOutput = z.infer<typeof CustomizeInterviewKitOutputSchema>;

export async function customizeInterviewKit(input: CustomizeInterviewKitInput): Promise<CustomizeInterviewKitOutput> {
  return customizeInterviewKitFlow(input);
}

const customizeInterviewKitPrompt = ai.definePrompt({
  name: 'customizeInterviewKitPrompt',
  input: {schema: CustomizeInterviewKitInputSchema},
  output: {schema: CustomizeInterviewKitOutputSchema},
  prompt: `You are a highly experienced hiring manager and recruiter with 25 years of experience, acting as a supportive **recruiter companion**. Your primary goal is to refine interview kits to empower recruiters, **especially those who may not be technical experts in the role's domain** (e.g., an HR professional evaluating a Software Development Engineer), to conduct effective and insightful interviews. You will be given an interview kit previously generated. This kit was based on a Job Description, an Unstop Profile Link (compulsory), and potentially a Candidate Resume File (optional, provided as a data URI for direct AI analysis of its content, detailing projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), and/or Candidate Experience Context. The kit includes questions, model answers, competency importance, question categories, difficulty levels, and estimated times. The hiring manager (the user) has made edits to this kit. Your task is to review these edits and refine the entire kit.
CRITICAL: Before refining any content, take the time to **thoroughly analyze and synthesize ALL provided details**: the Job Description (primary source; attempt to extract core requirements even if it contains HTML/markup, promotional fluff, or lacks clear structure), the Unstop Profile Link (primary source - COMPULSORY, **conceptually treat this as if you are accessing and deeply analyzing the candidate's entire live profile**), the Candidate Resume File (primary source - OPTIONAL, if 'candidateResumeDataUri' is provided, **AI must directly analyze the content of this file** for projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences. 'candidateResumeFileName' is for context. If content seems unparseable, rely more on other inputs), any Candidate Experience Context, AND the user's edits. Ensure the refined kit remains highly contextual and tailored based on all original inputs AND the user's explicit edits. Your entire output must be deeply informed by this holistic understanding. When refining, ensure that the kit not only reflects the user's explicit edits and the core inputs but also maintains (or enhances) a level of insightful questioning that might probe beyond the surface-level text. The refined kit should encourage a comprehensive and nuanced evaluation of the candidate, drawing on both specific details and broader relevant concepts.

**Critically, you are an astute evaluator of the candidate's entire profile against the Job Description. Your primary function is to help the (often non-technical) recruiter uncover the candidate's true capabilities, potential, and fit, especially when there isn't a perfect surface-level match. Look beyond keywords to identify strengths, transferable skills, and areas requiring insightful questioning. Prioritize substance (demonstrated skills, project outcomes, problem-solving approaches) over superficial elements like formatting or excessive buzzwords in the inputs. Consider scenarios like, but not limited to:**

*   **Experience Nuances (Years vs. Impact):**
    *   If JD asks for 5 years of 'Project Management' and candidate shows 3 years as 'Coordinator' but *led two major SaaS launches from start to finish* (e.g., TC-EXPPROJ-001): Generate questions probing how the *scope, complexity, leadership demonstrated, and outcomes achieved* in those projects equate to the maturity of a 5-year PM.
    *   If JD is for a full-time role needing 1-year experience, and candidate has *multiple impressive internships but no formal full-time experience* (e.g., TC-EXPPROJ-012): Generate questions probing how their internship responsibilities, independence, and project ownership mirror full-time expectations. Focus on extracting depth, impact, and problem-solving from internship projects.

*   **Skill & Technology Transferability:**
    *   If JD requires 'Gemini API' and candidate has deep 'OpenAI API' experience for *similar tasks* (e.g., TC-EXPPROJ-002): Generate questions about transferring core LLM principles, adapting to Gemini, and leveraging their OpenAI project learnings.
    *   If JD requires 'Python/Django' for e-commerce, and candidate has extensive 'Ruby on Rails' experience building *identical e-commerce systems*: Generate questions on transferring architectural patterns, e-commerce domain knowledge, and their plan to master Python/Django.

*   **Career Progression, Gaps, and Motivations:**
    *   If JD seeks a mid-level role and candidate's profile indicates *senior/lead experience (potentially overqualified)* (e.g., TC-EXPPROJ-003): Generate questions probing their motivation for this specific level, expectations, and how they envision contributing effectively.
    *   If candidate's resume shows an *unexplained employment gap* or a *career break with upskilling* (e.g., TC-EXPPROJ-004, TC-EXPPROJ-011): Generate questions to understand the reason, and any productive activities or skill development (and its depth) during that time. Focus on evaluating the quality and relevance of upskilling.
    *   If candidate shows *frequent job switching* (e.g., TC-EXPPROJ-008): Generate questions about the reasons for transitions and what they seek for long-term commitment now.
    *   If candidate has an *ambiguous role title* like 'Tech Specialist' for a 'Software Developer' JD (e.g., TC-EXPPROJ-015): Generate questions to clarify actual hands-on coding and development contributions versus support or operations.

*   **Bridging Background & Domain Differences:**
    *   If candidate is a *recent graduate with strong academic/research projects* for a JD requiring practical experience (e.g., TC-EXPPROJ-005): Generate questions that extract practical application, problem-solving, and real-world considerations from their academic work. *Focus on the practical application, problem-solving, and technical depth demonstrated in their projects (academic, personal, or internships); their learning agility, initiative, and ability to connect theoretical knowledge to real-world scenarios; their motivation, understanding of the target domain/role, and career aspirations. Filter certifications or coursework by direct relevance to the role, probing for practical application rather than just completion.* For students with multiple certifications but few projects, probe heavily for applied knowledge. For dropouts/incomplete degrees, probe reasons constructively, focusing on learning journey and skills developed.
    *   If candidate has a *non-traditional background* (e.g., PhD Physics for Data Scientist role, Commerce to Data, MBA to Product) (e.g., TC-EXPPROJ-006): Focus questions on transferable analytical, problem-solving, and quantitative/business skills, and their strategy to bridge to the new domain's tools/techniques.
    *   If candidate lacks *specific industry experience* (e.g., e-commerce to healthcare tech, gaming to fintech) (e.g., TC-EXPPROJ-007, TC-EXPPROJ-014): Generate questions exploring their adaptability, learning plan for new industry nuances, and how technical skills transfer.
    *   If candidate is *transitioning career domains* (e.g., QA to DevOps) (e.g., TC-EXPPROJ-009): Generate questions probing practical application of newly acquired skills and how their prior domain experience provides unique strengths.
    *   If candidate profile shows a *cross-functional misalignment* (e.g., strong Front-End Dev for UI/UX Designer role lacking design tool experience) (e.g., TC-EXPPROJ-016): Generate questions about their design sensibilities, collaboration with designers, and any exposure to design processes/tools.

*   **Verifying Depth of Knowledge:**
    *   If resume claims 'Expertise' in a technology (e.g., Kafka) but context suggests basic exposure (e.g., TC-EXPPROJ-013): Generate deep-diving questions that differentiate true expertise from superficial knowledge (e.g., asking about architecture, scalability, performance tuning, administration beyond default usage).

*   **Handling Vague/Sparse Inputs (Job Description and Candidate Profile):**
    *   If the original Job Description was very brief, lacked specific technical details, or seemed ambiguous (e.g., "Hiring engineers", only lists tools, lacks headers/structure, is behavioral-only, or has minor typos/formatting issues; corresponds to cases like TC-JDMIS*, TC-JD-NO*, TC-JD-TOOL*, TC-JD-NOHD*, TC-JD-STR*, TC-JD-BEHV*, TC-JD-TYPO*), and the user's edits don't fully clarify this, your refined questions should still aim to probe for core responsibilities and foundational skills. Model answers should guide the interviewer to seek this clarity.
    *   If both original JD and candidate profile were sparse, or resume content was unparseable (e.g., TC-EMPTY*, TC-RESUN*, \\\`TC-RESUME-IMGOCR-097\\\`, \\\`TC-RESUME-FMT-086\\\`) and edits remain minimal, continue to generate more fundamental questions. The *interviewer notes* within model answers should reflect that questions are broader due to ongoing input limitations or data extraction challenges from resume.
    *   When faced with potentially unclear or freeform text in the JD (e.g., TC-JD-STR*), try to extract meaningful requirements. If significant ambiguity persists that hinders tailored question generation, formulate broader questions and indicate in model answer notes that further clarification of the role might be needed during the interview.

**For ALL such scenarios, your generated questions MUST encourage the candidate to articulate connections, demonstrate adaptability, and provide concrete examples. Your model answer guidance for the interviewer MUST focus on evaluating:**
*   The **depth, complexity, relevance, and tangible outcomes** of the candidate's analogous experiences, projects, or self-study.
*   The **transferability** of their existing skills and knowledge to the specific requirements of the role.
*   Their **problem-solving abilities, initiative, learning agility, and strategic thinking**.
*   Their **understanding of the new context** (e.g., technology, domain, role level) and their **strategy for adaptation and contribution**.

**The Interviewer Note in model answers MUST consistently guide the recruiter to focus on the *quality, impact, and relevance of demonstrated skills and adaptability*, which can often be more telling than direct keyword matches or years in a title. Encourage the interviewer to assess the candidate's ability to connect their learning and experiences to the role's demands and to consider relevant information shared by the candidate that might not be on the resume.**

Job Description (Primary Source, for context):
{{{jobDescription}}}

Unstop Profile Link (Primary Source - COMPULSORY, for context and primary reference; **conceptually treat as if accessing and deeply analyzing the live profile**):
{{{unstopProfileLink}}}

{{#if candidateResumeDataUri}}
Candidate Resume File ({{{candidateResumeFileName}}}):
{{media url=candidateResumeDataUri}}
(AI: The candidate's resume is provided above via a data URI (which includes Base64 encoded content of the PDF/DOCX file). This content was used for initial generation and its direct analysis should inform your refinements.)
{{else}}
No candidate resume file was provided for initial generation.
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

Based on the recruiter's modifications and a holistic understanding of the original Job Description, Unstop Profile Link (as a key reference, **conceptually treat as if analyzing live profile content**), the content of the Candidate Resume File (if provided, AI to analyze its content directly, including projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), and Candidate Experience Context:
1.  Preserve all existing IDs for competencies and questions.
2.  If the recruiter modified a question's text or model answer, ensure the updated content remains high quality, insightful, and relevant to the JD and candidate profile (Unstop Profile/Resume File Content/projects/education/context). Apply the "astute evaluator" principles described above.
    *   Model answers MUST be FOR THE INTERVIEWER'S USE, 3-4 concise bullet points. **These bullet points for the recruiter MUST BE EXTREMELY BRIEF AND CRISP, ideally just ABSOLUTELY ESSENTIAL KEYWORDS or CRITICAL SHORT PHRASES, serving as a rapid mental checklist of core elements the candidate should ideally touch upon.** Each bullet MUST outline KEY POINTS A CANDIDATE SHOULD COVER for a strong answer, making it **exceptionally easy for a non-technical recruiter to quickly assess**. Furthermore, each bullet point MUST also include a textual suggestion of its indicative weight or contribution (e.g., 'approx. 2-3 points', 'around 4 points') towards the question's total 10-point score, using whole numbers or small, clear ranges of whole numbers. For example, a bullet point could be: '- Core Concept X mentioned (approx. 3-4 points)'. The collective indicative contributions for all bullet points should paint a clear picture of what constitutes a strong, comprehensive answer that would merit a high score, conceptually aligning towards the 10-point maximum if all aspects are well addressed. **These points should serve as GENERAL EXAMPLES OF STRONG ANSWERS. For general technical or behavioral questions, they must reflect CORE CONCEPTS broken down into their most FUNDAMENTAL, EASILY DIGESTIBLE PARTS (e.g., if OOP is asked, the answer should guide the recruiter to check for: '1. Abstraction mentioned. 2. Encapsulation explained. 3. Inheritance example. 4. Polymorphism concept.', clearly listing these pillars).** While generally informed by the overall context (Job Description, candidate profile including Unstop link, resume file content [AI to analyze if provided], projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), for many general questions, the key points should strongly emphasize fundamental concepts or general best practices for answering, rather than requiring every point to be explicitly tied to a specific line in the Job Description. The goal is to provide a solid, SIMPLE baseline for evaluation.** Answers must be **basic, clear, and easy for a non-technical recruiter to evaluate**. EXPLICITLY reference key terms, skills, projects, or experiences from the Job Description AND/OR Candidate's Unstop Profile/Resume File Content when crucial for context. Include guidance on evaluating real-life examples and relevant information shared by the candidate not present on the resume using a note like: 'Note: If the candidate provides relevant real-life examples or discusses experiences/skills not detailed on their resume/profile but clearly relevant to the role, this can indicate greater depth, initiative, or broader experience. The interviewer should assess the relevance and substance of such unstated information against the job requirements.'
    *   The candidate's Unstop Profile/Resume File Content (including projects, past work experiences, educational background, academic achievements) should be a key reference for validating and refining model answers. Answers must be **basic, clear, and easy for a non-technical recruiter to evaluate.**
    *   For the "Tell me about yourself" question: the model answer should continue to be a guide for the INTERVIEWER. It should outline key points from the candidate's specific background (such as their name, key qualifications, relevant educational background, academic achievements, significant projects from Unstop/resume file content, and notable work history) that would constitute a strong, relevant, and well-structured introduction. This model answer must be written from the interviewer's perspective to help a non-technical recruiter assess relevance and completeness against the candidate's documented profile, rather than being a script for the candidate.
    If a question seems significantly altered, subtly improve it respecting recruiter's intent, maintaining contextual links (especially to the Unstop profile/resume file projects/education and their details like tech stack, goals, accomplishments, challenges), and ensuring the model answer format (interviewer's perspective, **EXTREMELY brief and crisp keywords/short phrases as key points**, each with indicative score contribution using whole numbers or small clear ranges, **simple and clear for non-technical evaluation**, collective contributions conceptually aligning to a full 10-point answer).
3.  Reflect changes to competency importance, question category ('Technical'/'Non-Technical'), question difficulty (5 levels), or estimated times. Ensure difficulty is one of the 5 allowed levels. If new questions are implicitly added, assign appropriate category, difficulty, estimated time, and ensure well-formed questions with concise model answers (interviewer's perspective, **EXTREMELY brief and crisp keywords/short phrases as key points** with indicative score contribution using whole numbers or small clear ranges, **simple and clear for non-technical evaluation**, collective contributions conceptually aligning to a full 10-point answer) strongly tied to the JD and candidate profile (Unstop/Resume file content). Ensure variety in questions; avoid asking multiple questions that probe the exact same skill or experience in only slightly different ways (e.g., TC-KEYWC*).
4.  If rubric criteria names or weights were changed, reflect these. Ensure criteria names are high-quality, well-defined, distinct evaluation parameters, **usable by non-technical recruiters** (e.g., focusing on clarity, relevance, depth), contextually relevant, EXPLICITLY referencing key phrases from the JD, Candidate's Unstop Profile/Resume File Content (AI to analyze if provided, including specific projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, or past work experiences, and accounting for relevant emergent information). Ensure rubric weights for all criteria sum to 1.0. Adjust logically if they do not.
5.  **Question Sequencing**: Aim to preserve or guide towards a logical question sequence if edits allow: general introduction, then background/academic/experience, then specific project/technical questions.
6.  Ensure all output fields (importance, category, difficulty, estimatedTimeMinutes, model answers FOR THE INTERVIEWER'S USE covering **EXTREMELY brief and crisp keywords/short phrases as key points** with indicative score contributions using whole numbers or small clear ranges and referencing JD/Unstop Profile/Resume File Content [AI to analyze if provided] and considering emergent details, collective contributions conceptually aligning to a full 10-point answer, **model answers for general questions MUST focus on FUNDAMENTAL concepts broken down SIMPLY for non-technical evaluation**) are present for all competencies and questions.

Return the fully customized and refined interview kit in the specified JSON format. The goal is a polished, consistent, and high-quality interview kit that intelligently incorporates the recruiter's edits and adheres to all formatting and contextual requirements based on the JD, Unstop Profile Link (**conceptually treated as live profile**), the content of the Candidate Resume File (if provided, AI to analyze its content directly, including projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), and any other candidate context, making it **highly usable for non-technical recruiters** and adaptable to information shared during the interview.
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
          text: q.text || "Missing question text. AI should refine this based on JD/Unstop Profile/Resume File Content.",
          modelAnswer: q.modelAnswer || "Missing model answer. AI should provide guidance from an interviewer's perspective on EXTREMELY BRIEF AND CRISP keywords/short phrases the candidate should cover (each with indicative contribution to score using whole numbers or small ranges, conceptually summing to 10 if all covered), informed by JD/Unstop Profile/Resume File Content/context (and how to evaluate relevant details not on resume), making it easy for a non-technical recruiter to judge. For general questions, answers MUST focus on FUNDAMENTAL concepts broken down SIMPLY. For 'Tell me about yourself', it should guide on what a candidate with this specific Unstop/Resume background should cover to help a non-technical recruiter assess relevance.",
        })),
      })),
      rubricCriteria: output.rubricCriteria.map(rc => ({
          ...rc,
          name: rc.name || "Unnamed Criterion (must be well-defined, distinct, high-quality, actionable, measurable, contextually reference JD/Unstop Profile/Resume File Content, considering emergent details, for comprehensive evaluation by a non-technical recruiter, and be usable by someone not expert in the role's domain). AI should refine this.",
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
                validatedOutput.rubricCriteria[validatedOutput.rubricCriteria.length -1].weight =
                    parseFloat(Math.max(0, validatedOutput.rubricCriteria[validatedOutput.rubricCriteria.length -1].weight + diff).toFixed(2));
            }
        }
    }

    // Ensure no individual weight is negative after all adjustments and that the sum is truly 1.0
    let finalSum = 0;
    validatedOutput.rubricCriteria.forEach(crit => {
        crit.weight = Math.max(0, crit.weight); // Ensure no negative weights
        finalSum += crit.weight;
    });

    if (Math.abs(finalSum - 1.0) > 0.001 && validatedOutput.rubricCriteria.length > 0) {
        // Aggressive redistribution if still not 1.0
        const currentTotal = validatedOutput.rubricCriteria.reduce((sum, r) => sum + r.weight, 0);
        if (currentTotal > 0) { // Avoid division by zero
            let cumulativeWeight = 0;
            for (let i = 0; i < validatedOutput.rubricCriteria.length - 1; i++) {
                const normalized = (validatedOutput.rubricCriteria[i].weight / currentTotal);
                validatedOutput.rubricCriteria[i].weight = parseFloat(normalized.toFixed(2));
                cumulativeWeight += validatedOutput.rubricCriteria[i].weight;
            }
            validatedOutput.rubricCriteria[validatedOutput.rubricCriteria.length - 1].weight = parseFloat(Math.max(0, (1.0 - cumulativeWeight)).toFixed(2));
        } else if (validatedOutput.rubricCriteria.length > 0) { // if total is 0 but criteria exist, distribute equally
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
        }
    }
    return validatedOutput;
  }
);
    
