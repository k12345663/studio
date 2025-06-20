
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
    .describe('The job description to generate an interview kit for. This is a primary source material.'),
  unstopProfileLink: z.string().optional().describe("The candidate's Unstop profile link. This is a primary source material if provided; AI should (conceptually) treat this as if accessing and deeply analyzing the candidate's entire live profile for skills, projects, experience, education, academic achievements. THIS IS A COMPULSORY INPUT from the user."),
  candidateResumeDataUri: z.string().optional().describe("A data URI (e.g., 'data:application/pdf;base64,...') of the candidate's resume file (PDF or DOCX). If provided, AI should directly analyze the content of this file."),
  candidateResumeFileName: z.string().optional().describe("The original file name of the candidate's resume (e.g., 'resume.pdf'). For AI context if resume is provided."),
  candidateExperienceContext: z.string().optional().describe('Optional brief context about the target candidate’s experience level, current role, or past tech stack. E.g., "Junior developer, 1-2 years exp, proficient in React" or "Senior architect, 10+ years, extensive AWS and microservices experience." This supplements primary data sources.'),
});
export type GenerateInterviewKitInput = z.infer<typeof GenerateInterviewKitInputSchema>;

const QuestionAnswerPairSchema = z.object({
  question: z.string().describe('The interview question. Should be insightful and highly specific, directly derived from or probing into experiences, skills, projects (including their tech stack, goals, accomplishments, challenges), educational background, academic achievements, and past work experiences, and claims made in the Candidate\'s Unstop Profile (compulsory input, conceptually treat as if analyzing the live profile) and/or the content of the provided Resume File (optional input, AI will analyze its content directly if provided via data URI), the Job Description, as well as any Candidate Experience Context. This includes potentially asking "Tell me about yourself".'),
  answer: z.string().describe("A model answer FOR THE INTERVIEWER'S USE, presented as 3-4 concise bullet points. **These bullet points for the recruiter MUST BE EXTREMELY BRIEF AND CRISP, ideally just ABSOLUTELY ESSENTIAL KEYWORDS or CRITICAL SHORT PHRASES, serving as a rapid mental checklist of core elements the candidate should ideally touch upon.** Each bullet point MUST outline KEY POINTS A CANDIDATE SHOULD COVER for a strong answer, making it **exceptionally easy for a non-technical recruiter to quickly assess**. Furthermore, each bullet point MUST also include a textual suggestion of its indicative weight or contribution (e.g., 'approx. 2-3 points', 'around 4 points') towards the question's total 10-point score, using whole numbers or small, clear ranges of whole numbers. For example, a bullet point could be: '- Core Concept X mentioned (approx. 3-4 points)'. The collective indicative contributions for all bullet points should paint a clear picture of what constitutes a strong, comprehensive answer that would merit a high score, conceptually aligning towards the 10-point maximum if all aspects are well addressed. **These points should serve as GENERAL EXAMPLES OF STRONG ANSWERS. For general technical or behavioral questions, they must reflect CORE CONCEPTS broken down into their most FUNDAMENTAL, EASILY DIGESTIBLE PARTS (e.g., if OOP is asked, the answer should guide the recruiter to check for: '1. Abstraction mentioned. 2. Encapsulation explained. 3. Inheritance example. 4. Polymorphism concept.', clearly listing these pillars).** While generally informed by the overall context (Job Description, candidate profile including Unstop link, resume file content [AI to analyze if provided], projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), for many general questions, the key points should strongly emphasize fundamental concepts or general best practices for answering, rather than requiring every point to be explicitly tied to a specific line in the Job Description. The goal is to provide a solid, SIMPLE baseline for evaluation. Answers must be BASIC, CLEAR, and easy for a non-technical recruiter to evaluate. EXPLICITLY reference key terms, skills, projects, or experiences from the Job Description AND/OR the Candidate's Unstop Profile/Resume File Content when crucial for context. Include guidance on evaluating real-life examples and relevant information shared by the candidate not present on the resume using a note like: 'Note: If the candidate provides relevant real-life examples or discusses experiences/skills not detailed on their resume/profile but clearly relevant to the role, this can indicate greater depth, initiative, or broader experience. The interviewer should assess the relevance and substance of such unstated information against the job requirements.' For the \"Tell me about yourself\" question: if a Unstop profile or resume file is available, the model answer MUST be a guide for the INTERVIEWER. It should outline key points from the candidate's specific background (such as their name, key qualifications, relevant educational background, academic achievements, significant projects from Unstop/resume file content, and notable work history) that would constitute a strong, relevant, and well-structured introduction. This model answer must be written from the interviewer's perspective to help a non-technical recruiter assess relevance and completeness against the candidate's documented profile, rather than being a script for the candidate."),
  type: z.enum(['Technical', 'Scenario', 'Behavioral']).describe('The type of question. Technical for skills/tools, Scenario for problem-solving, Behavioral for past actions (STAR method).'),
  category: z.enum(['Technical', 'Non-Technical']).describe("The category of the question. 'Technical' for questions assessing specific hard skills or tool knowledge. 'Non-Technical' for questions assessing problem-solving, behavioral traits, scenarios, or soft skills (like 'Tell me about yourself'). Infer this primarily from the question type and content."),
  difficulty: z.enum(['Naive', 'Beginner', 'Intermediate', 'Expert', 'Master']).describe("The difficulty level of the question, on a 5-point scale: 'Naive', 'Beginner', 'Intermediate', 'Expert', 'Master'. Assign based on JD requirements and candidate's apparent skill level from Unstop profile/resume file content."),
  estimatedTimeMinutes: z.number().describe('Suitable estimated time in minutes a candidate might need for a thorough answer, considering question complexity and experience level. Default suggestions: Naive(2), Beginner(4), Intermediate(6), Expert(8), Master(10).'),
});

const CompetencySchema = z.object({
  name: z.string().describe('The name of the competency, derived from the job description and potentially informed by Unstop profile/resume file specifics (including educational background and academic achievements). One competency might be "Candidate Introduction & Background" or similar to house introductory questions.'),
  importance: z.enum(['High', 'Medium', 'Low']).describe('The importance of this competency for the role, based on the job description.'),
  questions: z.array(QuestionAnswerPairSchema).describe('The questions for the competency. Questions should be generated in a logical sequence: introductory questions first (like "Tell me about yourself", academic background, general experience), then project-specific questions (derived from Unstop profile/resume file content [AI to analyze if provided]), followed by other technical/scenario/behavioral questions. Questions should actively probe claims and details found in the candidate\'s Unstop profile/resume file content, including specific projects (their tech stack, goals, accomplishments, challenges), educational background, academic achievements, and past work experiences.'),
});

const ScoringCriterionSchema = z.object({
  criterion: z.string().describe("A well-defined, distinct, and high-quality scoring criterion for a non-technical recruiter to use. It must be actionable, measurable, and directly relevant to assessing candidate suitability. Focus on parameters like 'Clarity of Explanation', 'Relevance of Answer to Question', 'Depth of Understanding (as evidenced by examples or detail, including relevant experiences shared during the interview that may not be on the resume)', 'Problem-Solving Approach', 'Communication Skills'. Each criterion MUST explicitly mention key phrases, skills, concepts, project types, or relevant academic achievements from the Job Description AND/OR the Candidate's Unstop Profile/Resume File Content (AI to analyze if provided, including specific project details, educational background, academic achievements, and past work experiences) where appropriate to make it contextual. The set of criteria MUST provide a broad yet deeply contextual basis for comprehensive candidate evaluation, understandable by someone not expert in the role's domain."),
  weight: z.number().describe('The weight of this criterion (a value between 0.0 and 1.0). All criterion weights in the rubric must sum to 1.0.'),
});

const GenerateInterviewKitOutputSchema = z.object({
  competencies: z.array(CompetencySchema).describe('An array of 4-6 core competencies for the job. The first competency should ideally cover "Candidate Introduction & Background" including "Tell me about yourself", academic background, and general experience questions. Subsequent competencies should cover skills/projects (from Unstop profile/resume file content [AI to analyze if provided]), with questions sequenced logically. Competencies themselves should be informed by the holistic analysis of JD and candidate profile (Unstop link/resume file content, including educational background and academic achievements).'),
  scoringRubric: z
    .array(ScoringCriterionSchema)
    .describe("The 3-5 weighted scoring rubric criteria for the interview. Criteria MUST be contextually derived, well-defined, distinct, high-quality, actionable, measurable, and explicitly referencing key phrases from the Job Description AND/OR Candidate's Unstop Profile/Resume File Content (AI to analyze if provided, including specific project details, educational background, academic achievements, and past work experiences, and guiding the interviewer to also consider relevant information shared by the candidate that may not be on the resume) to provide a broad yet deeply contextual basis for comprehensive candidate evaluation. Frame criteria to be easily usable by a non-technical recruiter, focusing on aspects like clarity, relevance, and depth. For example: 'Criterion: Technical Communication Clarity. Weight: 0.3. (Assesses how clearly the candidate explains technical concepts from the JD or mentioned in their Unstop profile/resume file, like [specific skill/project], and any other relevant technical details they discuss.)'"),
});
export type GenerateInterviewKitOutput = z.infer<typeof GenerateInterviewKitOutputSchema>;

export async function generateInterviewKit(input: GenerateInterviewKitInput): Promise<GenerateInterviewKitOutput> {
  return generateInterviewKitFlow(input);
}

const generateInterviewKitPrompt = ai.definePrompt({
  name: 'generateInterviewKitPrompt',
  input: {schema: GenerateInterviewKitInputSchema},
  output: {schema: GenerateInterviewKitOutputSchema},
  prompt: `You are a highly experienced hiring manager and recruiter with 25 years of experience, acting as a supportive **recruiter companion**. Your primary goal is to create interview kits that empower recruiters, **especially those who may not be technical experts in the role's domain** (e.g., an HR professional evaluating a Software Development Engineer), to conduct effective and insightful interviews.
CRITICAL: Before generating content, **THOROUGHLY analyze and synthesize ALL provided inputs**:
1.  Job Description (Primary Source).
2.  Unstop Profile Link (Primary Source - **COMPULSORY**, **conceptually treat this as if you are accessing and deeply analyzing the candidate's entire live profile** for skills, projects, experience, education, academic achievements).
3.  Candidate Resume File (Primary Source - **OPTIONAL**, if provided as 'candidateResumeDataUri' containing a data URI for a PDF or DOCX file, **AI must directly analyze the content of this file** for skills, projects [tech stack, goals, accomplishments, challenges], education, academic achievements, past work experiences. The 'candidateResumeFileName' is also provided for context.).
4.  Candidate Experience Context (Supplements primary sources).
Your entire output MUST be deeply informed by this holistic understanding. Leverage this holistic understanding to generate not just questions that parrot information from the inputs, but also those that probe deeper into underlying skills, test problem-solving through relevant scenarios, and assess broader competencies critical for the role, even if these aspects are not exhaustively detailed line-by-line in every source document. Your aim is to create an insightful and comprehensive evaluation tool.

**Critically, you are an astute evaluator of the candidate's entire profile against the Job Description. Your primary function is to help the (often non-technical) recruiter uncover the candidate's true capabilities, potential, and fit, especially when there isn't a perfect surface-level match. Look beyond keywords to identify strengths, transferable skills, and areas requiring insightful questioning. Prioritize substance (demonstrated skills, project outcomes, problem-solving approaches) over superficial elements like formatting or excessive buzzwords in the inputs. Consider scenarios like, but not limited to:**

*   **Experience Nuances (Years vs. Impact):**
    *   If JD asks for 5 years of 'Project Management' and candidate shows 3 years as 'Coordinator' but *led two major SaaS launches from start to finish* (e.g., TC-EXPPROJ-001): Generate questions probing how the *scope, complexity, leadership demonstrated, and outcomes achieved* in those projects equate to the maturity of a 5-year PM.
    *   If JD is for a full-time role needing 1-year experience, and candidate has *multiple impressive internships but no formal full-time experience* (e.g., TC-EXPPROJ-012): Generate questions probing how their internship responsibilities, independence, and project ownership mirror full-time expectations.

*   **Skill & Technology Transferability:**
    *   If JD requires 'Gemini API' and candidate has deep 'OpenAI API' experience for *similar tasks* (e.g., TC-EXPPROJ-002): Generate questions about transferring core LLM principles, adapting to Gemini, and leveraging their OpenAI project learnings.
    *   If JD requires 'Python/Django' for e-commerce, and candidate has extensive 'Ruby on Rails' experience building *identical e-commerce systems*: Generate questions on transferring architectural patterns, e-commerce domain knowledge, and their plan to master Python/Django.

*   **Career Progression, Gaps, and Motivations:**
    *   If JD seeks a mid-level role and candidate's profile indicates *senior/lead experience (potentially overqualified)* (e.g., TC-EXPPROJ-003): Generate questions probing their motivation for this specific level, expectations, and how they envision contributing effectively.
    *   If candidate's resume shows an *unexplained employment gap* or a *career break with upskilling* (e.g., TC-EXPPROJ-004, TC-EXPPROJ-011): Generate questions to understand the reason, and any productive activities or skill development (and its depth) during that time.
    *   If candidate shows *frequent job switching* (e.g., TC-EXPPROJ-008): Generate questions about the reasons for transitions and what they seek for long-term commitment now.
    *   If candidate has an *ambiguous role title* like 'Tech Specialist' for a 'Software Developer' JD (e.g., TC-EXPPROJ-015): Generate questions to clarify actual hands-on coding and development contributions versus support or operations.

*   **Bridging Background & Domain Differences:**
    *   If candidate is a *recent graduate with strong academic/research projects* for a JD requiring practical experience (e.g., TC-EXPPROJ-005): Generate questions that extract practical application, problem-solving, and real-world considerations from their academic work. *Focus on the practical application, problem-solving, and technical depth demonstrated in their projects (academic, personal, or internships); their learning agility, initiative, and ability to connect theoretical knowledge to real-world scenarios; their motivation, understanding of the target domain/role, and career aspirations. Filter certifications or coursework by direct relevance to the role, probing for practical application rather than just completion.*
    *   If candidate has a *non-traditional background* (e.g., PhD Physics for Data Scientist role) (e.g., TC-EXPPROJ-006): Focus questions on transferable analytical, problem-solving, and quantitative skills, and their strategy to bridge to the new domain's tools/techniques.
    *   If candidate lacks *specific industry experience* (e.g., e-commerce to healthcare tech, gaming to fintech) (e.g., TC-EXPPROJ-007, TC-EXPPROJ-014): Generate questions exploring their adaptability, learning plan for new industry nuances, and how technical skills transfer.
    *   If candidate is *transitioning career domains* (e.g., QA to DevOps) (e.g., TC-EXPPROJ-009): Generate questions probing practical application of newly acquired skills and how their prior domain experience provides unique strengths.
    *   If candidate profile shows a *cross-functional misalignment* (e.g., strong Front-End Dev for UI/UX Designer role lacking design tool experience) (e.g., TC-EXPPROJ-016): Generate questions about their design sensibilities, collaboration with designers, and any exposure to design processes/tools.

*   **Verifying Depth of Knowledge:**
    *   If resume claims 'Expertise' in a technology (e.g., Kafka) but context suggests basic exposure (e.g., TC-EXPPROJ-013): Generate deep-diving questions that differentiate true expertise from superficial knowledge (e.g., asking about architecture, scalability, performance tuning, administration beyond default usage).

*   **Handling Vague/Sparse Inputs:**
    *   If the Job Description is very brief, lacks specific technical details, or seems ambiguous (e.g., TC-JDMIS*, TC-JD-NO*), prioritize generating questions that clarify the role's core responsibilities and required foundational skills. Your model answers should guide the interviewer to probe for this clarity.
    *   If both JD and candidate profile are sparse (e.g., TC-EMPTY*, TC-RESUN* if resume is also sparse), generate more fundamental questions appropriate for the general role type indicated. The *interviewer notes* within model answers should reflect that questions are broader due to input limitations.
    *   When faced with potentially unclear or freeform text in the JD (e.g., TC-JD-STR*), try to extract meaningful requirements. If significant ambiguity persists that hinders tailored question generation, formulate broader questions and indicate in model answer notes that further clarification of the role might be needed during the interview.

**For ALL such scenarios, your generated questions MUST encourage the candidate to articulate connections, demonstrate adaptability, and provide concrete examples. Your model answer guidance for the interviewer MUST focus on evaluating:**
*   The **depth, complexity, relevance, and tangible outcomes** of the candidate's analogous experiences, projects, or self-study.
*   The **transferability** of their existing skills and knowledge to the specific requirements of the role.
*   Their **problem-solving abilities, initiative, learning agility, and strategic thinking**.
*   Their **understanding of the new context** (e.g., technology, domain, role level) and their **strategy for adaptation and contribution**.

**The Interviewer Note in model answers MUST consistently guide the recruiter to focus on the *quality, impact, and relevance of demonstrated skills and adaptability*, which can often be more telling than direct keyword matches or years in a title. Encourage the interviewer to assess the candidate's ability to connect their learning and experiences to the role's demands and to consider relevant information shared by the candidate that might not be on the resume.**

Job Description (Primary Source):
{{{jobDescription}}}

Unstop Profile Link (Primary Source - COMPULSORY, **conceptually treat as if accessing and deeply analyzing the live profile**):
{{{unstopProfileLink}}}

{{#if candidateResumeDataUri}}
Candidate Resume File ({{{candidateResumeFileName}}}):
{{media url=candidateResumeDataUri}}
(AI: The candidate's resume is provided above via a data URI (which includes Base64 encoded content of the PDF/DOCX file). Please directly analyze the content of this file to extract skills, experiences, specific projects (including their tech stack, goals, accomplishments, challenges), educational background, academic achievements, and past work experiences to inform your question generation.)
{{else}}
No candidate resume file was provided.
{{/if}}

{{#if candidateExperienceContext}}
Candidate Experience Context (additional notes):
{{{candidateExperienceContext}}}
{{/if}}

Based on a holistic understanding of ALL available information (JD, Unstop Profile, and the content of the Candidate Resume File if provided, plus any context), generate the interview kit:

1.  **Structure the Interview Flow and Identify Competencies**:
    *   Start with a competency named "Candidate Introduction & Background."
    *   Identify 3-5 other core competencies from the JD, informed by the Unstop profile/resume file content (including educational background and academic achievements). Assign importance (High, Medium, Low).
    *   Prioritize substance (demonstrated skills, project outcomes) over superficial elements like formatting or excessive buzzwords in the inputs.

2.  **Generate Questions in a Logical Sequence & Ensure Variety**:
    *   **"Candidate Introduction & Background" competency**:
        *   "Tell me about yourself."
        *   Questions on academic background, qualifications, academic achievements (from Unstop profile/resume file content).
        *   Questions on overall work experience (from Unstop profile/resume file content).
    *   **Other competencies**:
        *   Prioritize **Resume/Profile Project Deep-Dive Question(s)**: If Unstop profile/resume file is provided, ensure questions **directly probe specific projects identified from analyzing the resume file content or Unstop profile**. Ask about: "tech stack used, primary goals, accomplishments, and significant challenges overcome" for Project X, or "role and contributions in Project Y, especially how you handled [specific challenge/goal from project description found in resume/profile]."
        *   Follow with other distinct, insightful questions (2-3 total per competency): Technical, Scenario, Behavioral, sharply tailored to JD and specifics from Unstop profile/resume file content/context (projects, tech stack, goals, accomplishments, challenges, education, past experiences). Apply the "astute evaluator" principles described above when generating these questions.
        *   Ensure variety in the questions generated for any single competency. Avoid asking multiple questions that probe the exact same skill or experience in only slightly different ways (e.g., TC-KEYWC*).

3.  **For EACH question, provide all fields as specified in the output schema**:
    *   \`question\`: Text of the question.
    *   \`answer\`: A model answer FOR THE INTERVIEWER'S USE (3-4 concise bullet points). **These bullet points for the recruiter MUST BE EXTREMELY BRIEF AND CRISP, ideally just ABSOLUTELY ESSENTIAL KEYWORDS or CRITICAL SHORT PHRASES, serving as a rapid mental checklist of core elements the candidate should ideally touch upon.** Each bullet MUST outline KEY POINTS A CANDIDATE SHOULD COVER for a strong answer, making it **exceptionally easy for a non-technical recruiter to quickly assess**. Furthermore, each bullet point MUST also include a textual suggestion of its indicative weight or contribution (e.g., 'approx. 2-3 points', 'around 4 points') towards the question's total 10-point score, using whole numbers or small, clear ranges of whole numbers. For example, a bullet point could be: '- Core Concept X mentioned (approx. 3-4 points)'. The collective indicative contributions for all bullet points should paint a clear picture of what constitutes a strong, comprehensive answer that would merit a high score, conceptually aligning towards the 10-point maximum if all aspects are well addressed. **These points should serve as GENERAL EXAMPLES OF STRONG ANSWERS. For general technical or behavioral questions, they must reflect CORE CONCEPTS broken down into their most FUNDAMENTAL, EASILY DIGESTIBLE PARTS (e.g., 'If OOP is asked, interviewer should note if candidate covers: 1. Abstraction mentioned. 2. Encapsulation explained. 3. Inheritance example. 4. Polymorphism concept.', clearly listing these pillars if relevant for a non-technical interviewer).** While generally informed by the overall context (Job Description, candidate profile including Unstop link, resume file content [AI to analyze if provided], projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), for many general questions, the key points should strongly emphasize fundamental concepts or general best practices for answering, rather than requiring every point to be explicitly tied to a specific line in the Job Description. The goal is to provide a solid, SIMPLE baseline for evaluation. Answers must be **basic, clear, and easy for a non-technical recruiter to evaluate**. EXPLICITLY reference key terms, skills, projects, or experiences from JD AND/OR Unstop Profile/Resume File Content when crucial for context. Include guidance on evaluating real-life examples and relevant information shared by the candidate not present on the resume using a note like: 'Note: If the candidate provides relevant real-life examples or discusses experiences/skills not detailed on their resume/profile but clearly relevant to the role, this can indicate greater depth, initiative, or broader experience. The interviewer should assess the relevance and substance of such unstated information against the job requirements.'
        For the "Tell me about yourself" question: if a Unstop profile or resume file is available, the model answer MUST be a guide for the INTERVIEWER. It should outline key points from the candidate's specific background (such as their name, key qualifications, relevant educational background, academic achievements, significant projects from Unstop/resume file content, and notable work history) that would constitute a strong, relevant, and well-structured introduction. This model answer must be written from the interviewer's perspective to help a non-technical recruiter assess relevance and completeness against the candidate's documented profile, rather than being a script for the candidate.
        For resume project deep-dive questions, guide on what to listen for regarding project goals, tech stack, accomplishments, challenges based on AI's analysis of the resume file.
    *   \`type\`: 'Technical', 'Scenario', 'Behavioral'.
    *   \`category\`: 'Technical' or 'Non-Technical'.
    *   \`difficulty\`: 'Naive', 'Beginner', 'Intermediate', 'Expert', 'Master'.
    *   \`estimatedTimeMinutes\`: Suitable time.

4.  **Create a Scoring Rubric (for a non-technical recruiter)**:
    *   3-5 weighted criteria. Each MUST be well-defined, distinct, high-quality, actionable, measurable, and **framed for easy use by a non-technical recruiter**. Focus on 'Clarity of Explanation', 'Relevance of Answer', 'Depth of Understanding (considering both resume-based details extracted by AI from file and emergent relevant details)', etc.
    *   Each criterion MUST explicitly mention key phrases, skills, concepts, project types, or academic achievements from JD AND/OR Unstop Profile/Resume File Content (AI to analyze if provided, including projects, education, past experiences) for context. Guide the recruiter to also consider relevant, substantiated information shared by the candidate that may not be on the resume.
    *   Set of criteria must provide broad yet deeply contextual basis for evaluation, **usable by someone not expert in the role's domain**. Weights sum to 1.0. Example: 'Criterion: Technical Communication - Clarity on [specific concept from JD or Unstop/Resume file content, and other relevant technical points discussed]. Weight: 0.25.'

Return JSON object per output schema. Populate all fields. Goal: logically sequenced kit, relevant tailored questions (from Unstop profile/resume file content [AI to analyze if provided]: projects, tech stack, goals, accomplishments, challenges, education, past experiences), concise judgeable model answers (recruiter's perspective, **EXTREMELY brief and crisp keywords/short phrases as key points**, each with indicative score contribution using whole numbers or small clear ranges, collective contributions conceptually aligning to a full 10-point answer; **model answers for general questions must focus on fundamental concepts broken down simply for non-technical evaluation**; "Tell me about yourself" model answer tailored from Unstop/resume file content to help a non-technical recruiter assess candidate's intro against their profile), contextual well-defined rubric for non-technical recruiters that accounts for emergent candidate information.
`,
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
          answer: q.answer || "Missing model answer. AI should provide guidance from an interviewer's perspective on EXTREMELY BRIEF AND CRISP keywords/short phrases the candidate should cover (each with indicative contribution to score using whole numbers or small ranges, conceptually summing to 10 if all covered), informed by JD/Unstop Profile/Resume File Content/context (including how to evaluate relevant details not on resume), making it easy for a non-technical recruiter to judge. For general questions, answers MUST focus on FUNDAMENTAL concepts broken down SIMPLY. For 'Tell me about yourself', it should guide on what a candidate with this specific Unstop/Resume background should cover to help a non-technical recruiter assess relevance.",
          type: q.type || "Behavioral",
          category: q.category || (q.type === 'Technical' ? 'Technical' : 'Non-Technical'),
          difficulty: q.difficulty || "Intermediate",
          estimatedTimeMinutes: q.estimatedTimeMinutes || (difficultyTimeMap[q.difficulty || "Intermediate"]),
        })),
      })),
      scoringRubric: (output.scoringRubric || []).map(crit => ({
        criterion: crit.criterion || "Unnamed Criterion (must be well-defined, distinct, high-quality, actionable, measurable, contextually reference JD/Unstop Profile/Resume File Content and account for emergent relevant details for comprehensive evaluation by a non-technical recruiter, and be usable by someone not expert in the role's domain). AI should refine this.",
        weight: typeof crit.weight === 'number' ? Math.max(0, Math.min(1, crit.weight)) : 0.2,
      })),
    };
     // Ensure rubric weights sum to 1.0
    let totalWeight = validatedOutput.scoringRubric.reduce((sum, crit) => sum + crit.weight, 0);
    if (validatedOutput.scoringRubric.length > 0) {
        if (totalWeight === 0 && validatedOutput.scoringRubric.length > 0) { // check length > 0
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
        } else if (Math.abs(totalWeight - 1.0) > 0.001) {
            const factor = 1.0 / totalWeight;
            let sumOfNormalizedWeights = 0;
            validatedOutput.scoringRubric.forEach((crit, index, arr) => {
                if (index < arr.length -1) {
                    crit.weight = parseFloat((crit.weight * factor).toFixed(2));
                    sumOfNormalizedWeights += crit.weight;
                } else {
                     // Ensure last element gets remaining weight, avoid negative
                    crit.weight = parseFloat(Math.max(0, (1.0 - sumOfNormalizedWeights)).toFixed(2));
                }
            });
        }
    }

    // Final check and adjustment for the last element if sum is still off due to accumulated rounding
    let finalSum = validatedOutput.scoringRubric.reduce((sum, crit) => sum + crit.weight, 0);
    if (Math.abs(finalSum - 1.0) > 0.001 && validatedOutput.scoringRubric.length > 0) {
        const diffToAdjust = parseFloat((1.0 - finalSum).toFixed(2));
        const lastCrit = validatedOutput.scoringRubric[validatedOutput.scoringRubric.length-1];
        lastCrit.weight = parseFloat(Math.max(0, lastCrit.weight + diffToAdjust).toFixed(2)); // Ensure not negative

        // One more pass if the last adjustment made it negative or still not 1.0
        // This is a safety net for complex rounding scenarios; aims to distribute remainder or deficit
        finalSum = validatedOutput.scoringRubric.reduce((sum, crit) => sum + crit.weight, 0);
        if (Math.abs(finalSum - 1.0) > 0.001 && validatedOutput.scoringRubric.length > 0) {
            let runningSum = 0;
            for(let i=0; i < validatedOutput.scoringRubric.length -1; i++) {
                // ensure individual weights are not negative from prior adjustments
                validatedOutput.scoringRubric[i].weight = Math.max(0, validatedOutput.scoringRubric[i].weight);
                runningSum += validatedOutput.scoringRubric[i].weight;
            }
            // Cap running sum if it somehow exceeded 1 due to prior aggressive adjustments
            runningSum = Math.min(runningSum, 1.0);
            const lastWeight = Math.max(0, 1.0 - runningSum);
            validatedOutput.scoringRubric[validatedOutput.scoringRubric.length-1].weight = parseFloat(lastWeight.toFixed(2));

            // Final forceful adjustment on the largest weighted item if still off by a tiny fraction.
            finalSum = validatedOutput.scoringRubric.reduce((s,c) => s + c.weight, 0);
             if (Math.abs(finalSum - 1.0) > 0.001 && validatedOutput.scoringRubric.length > 0) {
                 const finalAdjustment = parseFloat((1.0 - finalSum).toFixed(2));
                 // Find criterion with largest weight to absorb final tiny adjustment, or first if all are similar/zero
                 let targetCritForFinalAdj = validatedOutput.scoringRubric[0];
                 if(validatedOutput.scoringRubric.length > 1){
                    targetCritForFinalAdj = validatedOutput.scoringRubric.reduce((prev, current) => (prev.weight > current.weight) ? prev : current, validatedOutput.scoringRubric[0]);
                 }
                 targetCritForFinalAdj.weight = parseFloat(Math.max(0, targetCritForFinalAdj.weight + finalAdjustment).toFixed(2));
            }
        }
    }
    return validatedOutput;
  }
);

    