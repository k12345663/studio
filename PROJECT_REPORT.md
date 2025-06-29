# RecruTake: Project Report

## 1. Overview

RecruTake is a Next.js web application designed to assist recruiters and hiring managers by leveraging AI to generate and customize comprehensive interview kits. The system is architected with a strong emphasis on a **recruiter-centric approach**, particularly catering to evaluators who **may not be technical experts** in the specific domain of the role (e.g., an HR professional hiring for an SDE role). The AI acts as an experienced **recruiter companion** (25+ years experience), guiding the interviewer.

Users input a job description (pasted text) and a **compulsory Unstop Profile Link**. They can **optionally provide a candidate's resume file (PDF or DOCX)**, which is then converted client-side to a data URI and sent to the AI for **direct content analysis** (including projects, their tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences). The AI then produces a structured set of competencies and interview questions. Questions are generated in a logical sequence: starting with "Tell me about yourself," then academic background/qualifications, general experience, followed by project-specific deep dives (from Unstop Profile [conceptually treated as live profile analysis] and **the content of the provided resume file [if uploaded, AI analyzes it directly via data URI]**, including projects, their tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), and finally other technical/scenario/behavioral questions.

Questions are categorized (Technical or Non-Technical) and directly derived from analyzing the Unstop Profile (conceptually, as direct fetching/live analysis is a future goal) and **the content of the provided resume file (if uploaded, AI analyzes it directly via data URI**, including projects, their tech stack, goals, accomplishments, challenges, educational background, academic achievements, past work experiences), and JD requirements.

Model answers are formatted as 3-4 concise bullet points. These serve as **general examples of strong answers from an interviewer's perspective, highlighting key points a candidate should cover**, ensuring they are **basic, clear, and easy for a non-technical recruiter to evaluate**. Each bullet point also includes a textual suggestion of its indicative weight or contribution (e.g., "approx. 2-3 points") towards the question's total 10-point score. For some general technical or behavioral questions, while informed by the overall context, the key points in model answers might focus more on fundamental concepts or general best practices for answering, rather than requiring every point to be explicitly tied to a specific line in the Job Description. These answers also include notes for the interviewer on considering real-life examples or relevant information shared by the candidate that may not have been on their resume, as indicators of greater depth. A "Tell me about yourself" question includes a model answer tailored to the candidate's Unstop profile and **resume file content (if provided)**, **written from an interviewer's perspective**, guiding on what points a candidate should cover based on their specific background (work history, projects, education, academic achievements) to help a non-technical recruiter assess relevance.

The kit includes a 5-level difficulty rating ('Naive', 'Beginner', 'Intermediate', 'Expert', 'Master'), estimated answering times (auto-suggested based on difficulty: 2/4/6/8/10 mins), and a weighted scoring rubric. Rubric criteria are designed to be well-defined, distinct, high-quality, actionable, measurable, and contextually derived from the job details and candidate profile (Unstop profile [conceptually treated as live profile analysis] and **resume file content [if provided, AI analyzes it directly via data URI]**, including projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), focusing on aspects like clarity, relevance, and depth, **making them usable by non-technical evaluators**. The rubric design also prompts consideration for relevant candidate-shared information that might not be in the initial documents. Rubric criteria weights sum to 1.0.

Users can then edit this kit, including question category, difficulty, time, and content, and have the AI refine their changes. Panelists can use a 1-10 score slider for each question. An "Overall Interview Score" (average of question scores) is displayed.

## 2. Tech Stack

*   **Frontend Framework**: Next.js 15 (App Router)
*   **Language**: TypeScript
*   **UI Components**: ShadCN UI
*   **Styling**: Tailwind CSS (`src/app/globals.css` for theme)
*   **AI Integration**: OpenAI API (GPT-4o). AI Prompts are meticulously crafted to:
    *   Embody a highly experienced recruiter persona (25+ years), acting as a **recruiter companion**, adept at evaluation **even without deep domain expertise**, specifically to assist **non-technical recruiters**.
    *   Critically analyze and synthesize Job Description (primary source), Unstop Profile Link (compulsory primary source, **conceptually treated as live profile analysis**), **Candidate Resume File (optional primary source, provided as a data URI for direct AI analysis of its content**, including specific projects, their tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), and Candidate Experience Context.
    *   Generate questions in a logical sequence.
    *   Produce model answers **from an interviewer's perspective, highlighting key points to cover** (e.g., OOP pillars for a generic OOP question, clearly listing them), ensuring they are **basic, clear, and easy for non-technical recruiters to evaluate**. Each bullet point also suggests an indicative contribution to the question's 10-point score. For some general questions, the focus may be on fundamental principles rather than direct JD linkage for every point. Include guidance on evaluating real-life examples and relevant information shared by the candidate not present on the resume. "Tell me about yourself" model answers are interviewer-focused guides based on the Unstop profile/**resume file content (if provided)** (candidate's work history, projects, education, academic achievements), designed to help **non-technical recruiters** assess relevance.
    *   Create scoring rubrics with criteria focused on clarity, relevance, and depth, **usable by non-technical evaluators**, with weights summing to 1.0, and contextually tied to JD & Unstop profile/**resume file content (if provided, AI analyzes it directly via data URI**, including projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), while also being adaptable to emergent candidate information.
*   **State Management**: React state (`useState`, `useCallback`), `useToast`.
*   **Form Handling**: Standard React forms with client-side state management, including client-side conversion of selected resume files (PDF/DOCX) to data URIs using `FileReader.readAsDataURL()`.
*   **Package Manager**: npm

## 3. Project Structure
```
.
├── public/                     # Static assets
├── src/
│   ├── ai/                     # AI-related logic
│   │   └── flows/              # OpenAI flows
│   │       ├── customize-interview-kit.ts
│   │       └── generate-interview-kit.ts
│   ├── app/                    # Next.js App Router (pages, layouts)
│   │   ├── page.tsx            # Main application page component
│   │   ├── layout.tsx          # Root layout component
│   │   └── globals.css         # Global styles and Tailwind theme
│   ├── components/             # Reusable React components
│   │   ├── common/             # General-purpose components (e.g., LoadingIndicator)
│   │   ├── interview-kit/      # Components specific to the interview kit
│   │   ├── layout/             # Layout components (e.g., AppHeader)
│   │   └── ui/                 # ShadCN UI components
│   ├── hooks/                  # Custom React hooks (e.g., useToast)
│   ├── lib/                    # Utility functions
│   │   ├── utils.ts            # General utilities (e.g., cn for Tailwind)
│   │   └── openai.ts           # OpenAI client and API utilities
│   ├── types/                  # TypeScript type definitions
│   │   └── interview-kit.ts    # Core data structures for the app
├── .env.example                # Environment variables template
├── .gitignore
├── components.json             # ShadCN UI configuration
├── next.config.ts              # Next.js configuration
├── package.json                # Project dependencies and scripts
├── tailwind.config.ts          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
└── PROJECT_REPORT.md           # This file
```

**Key Directories & Files:**

*   **`src/app/page.tsx`**: Main UI, state management for inputs (JD, Unstop link, **candidateResumeDataUri, candidateResumeFileName**, context), orchestrates AI calls.
*   **`src/ai/flows/generate-interview-kit.ts`**: Defines the OpenAI flow for initial kit generation. The prompt instructs the AI (as an experienced **recruiter companion for non-technical evaluators**) to deeply analyze JD, Unstop Profile link (compulsory, **conceptually treated as live profile analysis**), and **candidate resume file (optional, if provided as a data URI, AI directly analyzes its content including projects, tech stack, goals, accomplishments, challenges, education, academic achievements, experience)** as primary sources. Generates questions logically (intro, academic, experience, project deep-dives, technical/scenario/behavioral). Model answers are from an interviewer's perspective, guiding on key points to cover (e.g., OOP pillars for a generic OOP question, clearly listing them), with indicative mark contributions, are **basic, clear, and easy for non-technical recruiters to judge** (allowing some general questions to focus on fundamental principles rather than strict JD mapping for every point), and include notes on evaluating real-life examples and emergent relevant information. Rubrics are designed for **non-technical evaluation** (clarity, relevance, depth), contextually tied to JD & Unstop profile/**resume file content (if provided, AI analyzes it directly via data URI**, including projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), and adaptable to new candidate-shared details. "Tell me about yourself" model answer is an interviewer-focused guide based on the Unstop profile/**resume file content (if provided)** (candidate's work history, projects, education, academic achievements), aimed at helping **non-technical recruiters** assess relevance.
*   **`src/ai/flows/customize-interview-kit.ts`**: OpenAI flow for refining kits, maintaining the **recruiter-centric, non-technical companion** philosophy, using Unstop profile link (**conceptually treated as live profile analysis**) and **resume file (if `candidateResumeDataUri` was provided, AI uses its content)** as key references, and ensuring adaptability to emergent candidate information and ease of use for non-technical evaluators. Model answers allow for some general questions to focus on fundamental principles.
*   **`src/lib/openai.ts`**: OpenAI client setup and utility functions for API calls.
*   **`src/components/interview-kit/JobDescriptionForm.tsx`**: User input for JD (text), **Unstop Profile Link (compulsory text URL)**, and **optional Candidate Resume File (PDF/DOCX, selected by user, converted to data URI client-side for direct AI analysis of its content)**.
*   **`src/components/interview-kit/InterviewKitDisplay.tsx`**: Renders the kit, calculates and displays "Overall Interview Score."
*   **`src/components/interview-kit/CompetencyAccordion.tsx`**: Displays competencies; questions grouped by "Technical" and "Non-Technical" categories.
*   **`src/components/interview-kit/QuestionEditorCard.tsx`**: Allows editing questions, model answers, category, 5-level difficulty, estimated time, and 1-10 panelist score.
*   **`src/components/interview-kit/RubricEditor.tsx`**: For editing scoring rubric criteria (focused on clarity, relevance, depth for **non-technical evaluators**, contextually based on JD & Unstop/**resume file content (if provided, AI analyzes it directly via data URI**, including projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), and adaptable to new candidate information) and weights (sum to 1.0). Textarea used for criterion name for better visibility.
*   **`src/types/interview-kit.ts`**: Core data structures including `unstopProfileLink` (compulsory input from user to page, conceptually treated as live profile data source) and `candidateResumeDataUri`, `candidateResumeFileName` (optional, for direct AI analysis of uploaded resume file content).

## 4. AI Integration

*   **OpenAI Setup (`src/lib/openai.ts`)**: Uses OpenAI API with GPT-4o model.
*   **Core AI Flows (`src/ai/flows/`)**:
    A critical instruction in both flows is for the AI to embody an experienced recruiter (25+ years), acting as a **recruiter companion**, capable of assisting evaluators **even without deep technical expertise in the role's domain**. The AI must *first thoroughly analyze and synthesize ALL provided user details (Job Description, Unstop Profile Link [compulsory, **conceptually treated as live profile analysis**], **Candidate Resume File [optional, if `candidateResumeDataUri` is provided, AI directly analyzes the content of this file** for projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences], and Candidate Experience Context) before generating or refining any content. The Unstop Profile Link and Candidate Resume File (if provided), along with the Job Description, serve as primary source materials.* Model answers and rubrics are designed to also help evaluate relevant information shared by the candidate during the interview that might not have been on the resume, focusing on ease of use for **non-technical recruiters**.

    1.  **`generateInterviewKit`**:
        *   **Input**: `jobDescription`, `unstopProfileLink` (compulsory, **conceptually treated as live profile analysis**), `candidateResumeDataUri` and `candidateResumeFileName` (optional, for **direct AI analysis of resume file content**, including projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), `candidateExperienceContext`.
        *   **Process**: AI acts as an experienced **recruiter companion for non-technical evaluators**. Analyzes inputs to generate competencies and logically sequenced questions. Model answers are from an interviewer's perspective, outlining key points a candidate should cover (e.g., if OOP is asked, the answer should guide the recruiter to check for the 4 pillars, clearly listing them), with indicative mark contributions, are **basic, clear, and easy for non-technical recruiters to judge**. For some general questions, key points in model answers may focus on fundamental concepts or best practices rather than strict JD mapping for every point. Includes notes on how to interpret real-life examples and other relevant information shared by the candidate. Rubric criteria are framed for **non-technical evaluators** (clarity, relevance, depth), contextually tied to JD & Unstop Profile/**Resume File Content (if provided, AI analyzes it directly via data URI**, including projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), and adaptable to emergent candidate details. "Tell me about yourself" model answer is an interviewer-focused guide based on the Unstop profile/**resume file content (if provided)** (candidate's work history, projects, education, academic achievements), designed to help **non-technical recruiters** assess relevance.
        *   **Output**: Structured interview kit. Post-processing normalizes rubric weights and applies default times.

    2.  **`customizeInterviewKit`**:
        *   **Input**: Full current kit state, including original JD, Unstop profile link (**conceptually treated as live profile analysis**), `candidateResumeDataUri` and `candidateResumeFileName` (if originally provided, for **direct AI analysis of resume file content**, including projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), context, and user edits.
        *   **Process**: AI reviews edits, maintaining the **recruiter companion for non-technical evaluators** philosophy. Refines questions/answers, ensuring model answers remain practical guides for **non-technical evaluators** (basic, clear, highlighting key points with indicative mark contributions, allowing some general questions to focus on fundamental principles) and adaptable to emergent information. Normalizes rubric weights.
        *   **Output**: Refined interview kit.

## 5. Workflow

1.  **Input**: User pastes JD, provides a **compulsory Unstop Profile Link**, and optionally selects a resume file (PDF/DOCX). **The selected file is converted to a data URI client-side and its content is directly analyzed by the AI** (including projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences) via `JobDescriptionForm.tsx`. User may also provide additional context.
2.  **Generation**: `generateInterviewKit` flow is called. AI produces the kit.
3.  **Display**: `InterviewKitDisplay.tsx` renders the kit. `CompetencyAccordion` shows questions (Technical/Non-Technical). `QuestionEditorCard` allows edits and 1-10 scoring. `RubricEditor` for rubric changes. "Overall Interview Score" is displayed.
4.  **Customization**: User edits update local state. "Update & Regenerate" calls `customizeInterviewKit`.

## 6. Running the Application

1.  **Install Dependencies**: `npm install`
2.  **Environment Setup**: Create `.env.local` with OpenAI API key
3.  **Run Development Server**: `npm run dev` (Next.js on `http://localhost:9002`)

## 7. OpenAI API Configuration

The application uses OpenAI's GPT-4o model, which provides:
- Advanced resume analysis capabilities with vision support for PDF/image content
- Sophisticated job description parsing and requirement extraction
- Context-aware interview question generation
- Intelligent model answer creation with scoring guidance
- Adaptive scoring rubric development

Environment variables required:
- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `OPENAI_MODEL`: Model to use (optional, defaults to gpt-4o)
- `OPENAI_ORGANIZATION`: Organization ID (optional)

## 8. Potential Future Enhancements

*   Backend PDF/DOC resume parsing (if needed beyond current client-side data URI conversion for AI analysis) and storage.
*   Automated candidate data fetching and parsing from live Unstop profiles via API integration.
*   UI support for explicit partial marking and bonus points in scoring.
*   User Authentication & Database Integration.
*   Export Options (PDF, DOCX).
*   More granular AI regeneration (e.g., single question).
*   Integration with other AI providers for redundancy and cost optimization.

This report reflects the application's migration to OpenAI API while maintaining its design emphasis on a recruiter-centric companion approach suitable for **non-technical evaluators**, with comprehensive analysis capabilities for job descriptions and candidate profiles.