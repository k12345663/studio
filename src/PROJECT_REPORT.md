
# RecruTake: Project Report

## 1. Overview

RecruTake is a Next.js web application designed to assist recruiters and hiring managers by leveraging AI to generate and customize comprehensive interview kits. The system is architected with a strong emphasis on a **recruiter-centric approach**, particularly catering to evaluators who may not be technical experts in the specific domain of the role (e.g., an HR professional hiring for an SDE role).

Users input a job description (pasted text). For candidate information, they can paste resume text or relevant details from a candidate's profile (e.g., Unstop profile). The AI then produces a structured set of competencies and interview questions. Questions are generated in a logical sequence: starting with "Tell me about yourself," then academic background/qualifications, general experience, followed by project-specific deep dives, and finally other technical/scenario/behavioral questions.

Questions are categorized (Technical or Non-Technical) and directly derived from analyzing the resume/profile data (including projects, their tech stack, goals, accomplishments, challenges, educational background, academic achievements, past work experiences) and JD requirements.

A "Tell me about yourself" question includes a model answer tailored to the candidate's resume/profile, **written from an interviewer's perspective**, guiding on what points a candidate should cover based on their specific background. Model answers for all questions are formatted as 3-4 concise, judgeable bullet points. These serve as **general examples of strong answers from an interviewer's perspective, highlighting key points a candidate should cover**, ensuring they are basic, clear, and easy for a non-technical recruiter to evaluate. These answers also include notes for the interviewer on considering real-life examples provided by the candidate as indicators of greater depth.

The kit includes a 5-level difficulty rating ('Naive', 'Beginner', 'Intermediate', 'Expert', 'Master'), estimated answering times (auto-suggested based on difficulty: 2/4/6/8/10 mins), and a weighted scoring rubric. Rubric criteria are designed to be well-defined, distinct, high-quality, actionable, measurable, and contextually derived from the job details and candidate profile, focusing on aspects like clarity, relevance, and depth, making them usable by non-technical evaluators. Rubric criteria weights sum to 1.0.

Users can then edit this kit, including question category, difficulty, time, and content, and have the AI refine their changes. Panelists can use a 1-10 score slider for each question. An overall interview score (average of question scores) is displayed.

**Future Considerations (Beyond Current Scope of XML-based Edits):**
*   Direct PDF/DOC resume upload and parsing.
*   Automatic fetching of candidate data from Unstop profiles via API integration.
*   Enhanced UI for explicit partial marking or bonus point systems.

## 2. Tech Stack

*   **Frontend Framework**: Next.js 15 (App Router)
*   **Language**: TypeScript
*   **UI Components**: ShadCN UI
*   **Styling**: Tailwind CSS (`src/app/globals.css` for theme)
*   **AI Integration**: Genkit (Google's Gemini models). AI Prompts are meticulously crafted to:
    *   Embody a highly experienced recruiter persona, adept at evaluation even without deep domain expertise.
    *   Critically analyze and synthesize Job Description (primary source), Candidate Resume/Profile data (primary source, including specific projects, their tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), and Candidate Experience Context.
    *   Generate questions in a logical sequence.
    *   Produce model answers from an interviewer's perspective, highlighting key points to cover, ensuring they are generic enough for core concepts but deeply contextualized. Include guidance on evaluating real-life examples.
    *   Create scoring rubrics with criteria focused on clarity, relevance, and depth, usable by non-technical recruiters, with weights summing to 1.0.
*   **State Management**: React state (`useState`, `useCallback`), `useToast`.
*   **Form Handling**: Standard React forms.
*   **Package Manager**: npm

## 3. Project Structure
```
.
├── public/                     # Static assets
├── src/
│   ├── ai/                     # AI-related logic
│   │   ├── flows/              # Genkit flows
│   │   │   ├── customize-interview-kit.ts
│   │   │   └── generate-interview-kit.ts
│   │   └── genkit.ts           # Genkit initialization
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
│   ├── lib/                    # Utility functions (e.g., cn for Tailwind)
│   ├── types/                  # TypeScript type definitions
│   │   └── interview-kit.ts    # Core data structures for the app
├── .env                        # Environment variables (empty by default)
├── .gitignore
├── components.json             # ShadCN UI configuration
├── next.config.ts              # Next.js configuration
├── package.json                # Project dependencies and scripts
├── tailwind.config.ts          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
└── PROJECT_REPORT.md           # This file
```

**Key Directories & Files:**

*   **`src/app/page.tsx`**: Main UI, state management, orchestrates AI calls.
*   **`src/ai/flows/generate-interview-kit.ts`**: Defines the AI flow for initial kit generation. The prompt instructs the AI (as an experienced, non-domain-expert recruiter) to deeply analyze JD and candidate resume/profile (projects, tech stack, goals, accomplishments, challenges, education, experience) as primary sources. Generates questions logically (intro, academic, experience, project deep-dives, technical/scenario/behavioral). Model answers are from an interviewer's perspective, guiding on key points to cover (e.g., OOP pillars for a generic OOP question), and include notes on evaluating real-life examples. Rubrics are designed for non-technical evaluation (clarity, relevance, depth).
*   **`src/ai/flows/customize-interview-kit.ts`**: AI flow for refining kits, maintaining the recruiter-centric, non-technical evaluation philosophy.
*   **`src/ai/genkit.ts`**: Genkit setup.
*   **`src/components/interview-kit/JobDescriptionForm.tsx`**: User input for JD (text), candidate resume/profile details (text). Mentions future goals of PDF/DOC upload and Unstop integration.
*   **`src/components/interview-kit/InterviewKitDisplay.tsx`**: Renders the kit, calculates and displays "Overall Interview Score."
*   **`src/components/interview-kit/CompetencyAccordion.tsx`**: Displays competencies; questions grouped by "Technical" and "Non-Technical" categories.
*   **`src/components/interview-kit/QuestionEditorCard.tsx`**: Allows editing questions, model answers, category, 5-level difficulty, estimated time, and 1-10 panelist score.
*   **`src/components/interview-kit/RubricEditor.tsx`**: For editing scoring rubric criteria (focused on clarity, relevance, depth for non-technical evaluators) and weights (sum to 1.0).
*   **`src/types/interview-kit.ts`**: Core data structures.

## 4. AI Integration

*   **Genkit Setup (`src/ai/genkit.ts`)**: Uses `googleai/gemini-2.0-flash`.
*   **Core AI Flows (`src/ai/flows/`)**:
    A critical instruction in both flows is for the AI to embody an experienced recruiter capable of evaluating candidates even without deep technical expertise in the role's domain. The AI must *first thoroughly analyze and synthesize ALL provided user details (Job Description, Candidate Resume/Profile including specific projects, their tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences, and Candidate Experience Context) before generating or refining any content. The Candidate Resume/Profile, if provided, along with the Job Description, serve as primary source materials.*

    1.  **`generateInterviewKit`**:
        *   **Input**: `jobDescription`, `candidateResume` (text, from pasted resume or profile data), `candidateExperienceContext`.
        *   **Process**: AI acts as an experienced recruiter. Analyzes inputs to generate competencies and logically sequenced questions. Model answers are from an interviewer's perspective, outlining key points a candidate should cover (e.g., if OOP is asked, the answer should guide the recruiter to check for the 4 pillars). Includes notes on how to interpret real-life examples. Rubric criteria are framed for non-technical evaluators (clarity, relevance, depth), contextually tied to JD/resume.
        *   **Output**: Structured interview kit. Post-processing normalizes rubric weights and applies default times.

    2.  **`customizeInterviewKit`**:
        *   **Input**: Full current kit state, including original JD, resume/profile data, context, and user edits.
        *   **Process**: AI reviews edits, maintaining the recruiter-centric philosophy. Refines questions/answers, ensuring model answers remain practical guides for non-technical evaluators. Normalizes rubric weights.
        *   **Output**: Refined interview kit.

## 5. Workflow

1.  **Input**: User pastes JD and optionally candidate resume text/profile details into `JobDescriptionForm.tsx`.
2.  **Generation**: `generateInterviewKit` flow is called. AI produces the kit.
3.  **Display**: `InterviewKitDisplay.tsx` renders the kit. `CompetencyAccordion` shows questions (Technical/Non-Technical). `QuestionEditorCard` allows edits and 1-10 scoring. `RubricEditor` for rubric changes. "Overall Interview Score" is displayed.
4.  **Customization**: User edits update local state. "Update & Regenerate" calls `customizeInterviewKit`.

## 6. Running the Application

1.  **Install Dependencies**: `npm install`
2.  **Run Development Server**: `npm run dev` (Next.js on `http://localhost:9002`)
3.  **Run Genkit Server** (optional): `npm run genkit:dev` (Genkit UI on `http://localhost:4000`)

## 7. Potential Future Enhancements (Identified, beyond current direct implementation scope)

*   Direct PDF/DOC resume upload and parsing.
*   Automated candidate data fetching from Unstop profiles (API integration).
*   UI support for explicit partial marking and bonus points.
*   User Authentication & Database Integration.
*   Export Options (PDF, DOCX).
*   More granular AI regeneration (e.g., single question).

This report reflects the application's design, emphasizing a recruiter-centric approach suitable for non-technical evaluators.
    