
# RecruTake: Project Report

## 1. Overview

RecruTake is a Next.js web application designed to assist recruiters and hiring managers by leveraging AI to generate and customize comprehensive interview kits. Users can input a job description by pasting text, and optionally provide a candidate's resume and additional context about the target candidate's experience level (e.g., years of experience, current role, past tech stack). The application will then produce a structured set of competencies, interview questions (categorized as Technical or Non-Technical), model answers (formatted as 3-4 concise, judgeable bullet points explicitly referencing JD/resume/context, serving as general examples of strong answers), a 5-level difficulty rating ('Naive', 'Beginner', 'Intermediate', 'Expert', 'Master'), estimated answering times (auto-suggested based on difficulty: 2/4/6/8/10 mins), and a weighted scoring rubric that is contextually derived from the job details and candidate profile (referencing key phrases from JD/resume/context for comprehensive evaluation). Users can then edit this kit, including question category, difficulty, time, and content, and have the AI refine their changes. Panelists can use a 1-10 score slider for each question.

## 2. Tech Stack

The application is built with a modern, server-centric approach:

*   **Frontend Framework**: Next.js 15 (using the App Router)
*   **Language**: TypeScript
*   **UI Components**: ShadCN UI - A collection of re-usable UI components.
*   **Styling**: Tailwind CSS - A utility-first CSS framework for rapid UI development. Global styles and theme variables (CSS HSL) are managed in `src/app/globals.css`.
*   **AI Integration**: Genkit - An open-source framework from Google for building AI-powered applications. It's used here to connect to Google's Gemini models.
*   **State Management**: Primarily React's built-in state (`useState`, `useCallback`) and context where appropriate (e.g., `useToast`).
*   **Form Handling**: Standard React form handling.
*   **Linting/Formatting**: ESLint, Prettier (implicitly, through Next.js defaults).
*   **Package Manager**: npm

## 3. Project Structure

The project follows a standard Next.js App Router structure:

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

*   **`src/app/page.tsx`**: The main entry point for the application's UI. It handles state for the job description, candidate resume, candidate experience context, the generated interview kit, loading states, and orchestrates calls to AI flows. The initial welcome screen does not display a placeholder image.
*   **`src/ai/flows/`**: Contains the Genkit flows.
    *   **`generate-interview-kit.ts`**: Defines the AI flow for generating an interview kit. The prompt instructs the AI to *critically analyze and synthesize all provided user inputs* (Job Description, Candidate Resume, Candidate Experience Context). It generates questions with categories (Technical/Non-Technical), a 5-level difficulty, model answers (3-4 concise, judgeable bullet points explicitly referencing JD/resume/context, serving as general examples of strong answers), suggested estimated times, and a scoring rubric with criteria explicitly referencing key phrases from all provided inputs for a broad yet deeply contextual evaluation.
    *   **`customize-interview-kit.ts`**: Defines the AI flow for refining a user-modified interview kit. The prompt emphasizes *thorough analysis of all inputs including recruiter edits*. It ensures model answers adhere to the 3-4 bullet point format and contextual referencing (serving as general examples of strong answers), and rubric criteria maintain deep contextual relevance.
*   **`src/ai/genkit.ts`**: Initializes Genkit with the Google AI plugin and configures the default model.
*   **`src/components/interview-kit/`**: Houses all components related to displaying and editing the interview kit:
    *   `JobDescriptionForm.tsx`: For user input of the job description (text-based), candidate resume (text-based, optional), and optional candidate experience context.
    *   `InterviewKitDisplay.tsx`: The main component for showing the generated kit.
    *   `CompetencyAccordion.tsx`: Displays competencies, with questions grouped into "Technical Questions" and "Non-Technical Questions" sub-sections based on their category.
    *   `QuestionEditorCard.tsx`: Allows editing individual questions, their model answers, category (Technical/Non-Technical), 5-level difficulty (Naive to Master, with auto-time suggestion), estimated time, and a 1-10 panelist score slider.
    *   `RubricEditor.tsx`: Allows editing scoring rubric criteria and weights.
*   **`src/components/common/LoadingIndicator.tsx`**: An enhanced loading indicator for better visual feedback during processing.
*   **`src/types/interview-kit.ts`**: Defines the TypeScript interfaces for `ClientQuestion` (including `category`, 5-level `QuestionDifficulty`, 1-10 `score`), `ClientCompetency`, `ClientRubricCriterion`, and `InterviewKit` (including `candidateResume`). Includes `difficultyTimeMap`.
*   **`src/app/globals.css`**: Contains global CSS, Tailwind directives, and the HSL color variables for theming. Includes custom scrollbar styling.

## 4. AI Integration

AI capabilities are central to RecruTake and are implemented using **Genkit**.

*   **Genkit Setup (`src/ai/genkit.ts`)**:
    *   Genkit is initialized with the `googleAI` plugin, enabling access to Google's AI models.
    *   The default model is set to `googleai/gemini-2.0-flash`.

*   **Core AI Flows (`src/ai/flows/`)**:
    A critical instruction in both flows is for the AI to *first thoroughly analyze and synthesize ALL provided user details (Job Description, Candidate Resume, and Candidate Experience Context) before generating or refining any content. The entire output must be deeply informed by this holistic understanding.*

    1.  **`generateInterviewKit`**:
        *   **Input**: `jobDescription` (string, pasted by the user), `candidateResume` (optional string, pasted by user), `candidateExperienceContext` (optional string).
        *   **Process**:
            *   A detailed prompt instructs the AI (Gemini model) to act as a senior hiring manager, thoroughly analyzing and synthesizing the JD, candidate resume, and candidate context.
            *   It identifies 5-7 core competencies, assigning importance (High, Medium, Low).
            *   For each competency, it generates 3 types of questions (Technical, Scenario, Behavioral).
            *   For each question, it provides:
                *   A model answer (3-4 concise, judgeable bullet points, serving as general examples of strong answers, explicitly referencing JD/resume/context, and highlighting positive indicators).
                *   A `category` ('Technical' or 'Non-Technical').
                *   A `difficulty` level ('Naive', 'Beginner', 'Intermediate', 'Expert', 'Master').
                *   An `estimatedTimeMinutes` (AI suggests based on difficulty, e.g., Naive:2, Master:10).
            *   It also generates a scoring rubric with 3-5 weighted criteria (summing to 1.0), with criteria explicitly referencing key phrases from the JD, resume, or candidate context for a broad yet deeply contextual evaluation.
        *   **Output Schema (`GenerateInterviewKitOutputSchema` using Zod)**: A structured JSON object. Zod descriptions guide the AI.
        *   **Error Handling**: Basic error checking and default-filling ensures the AI output is usable. Post-processing normalizes rubric weights and applies default times if AI misses them.

    2.  **`customizeInterviewKit`**:
        *   **Input**: `jobDescription`, `candidateResume`, `candidateExperienceContext`, `competencies` (potentially user-edited, including IDs, importance, questions with category, IDs, 5-level difficulty, time), and `rubricCriteria` (potentially user-edited).
        *   **Process**:
            *   The prompt instructs the AI to review recruiter edits, thoroughly considering JD, resume, context, and the edits.
            *   It must preserve existing IDs.
            *   It refines modified question text/answers (ensuring 3-4 concise, judgeable bullet format serving as general examples of strong answers, explicitly referencing JD/resume/context).
            *   It reflects changes to importance, category, difficulty, or time, and assigns these if new questions seem to be implicitly added.
            *   It reflects changes to rubric criteria (ensuring criteria explicitly reference key phrases from JD/resume/context for a broad yet contextual evaluation, and weights sum to 1.0).
            *   It ensures all output fields are present.
        *   **Output Schema (`CustomizeInterviewKitOutputSchema` using Zod)**: A refined version of the interview kit.
        *   **Error Handling & Validation**: Includes logic to ensure output fields are present, rubric weights are normalized, and default times are applied.

*   **Schema Enforcement**: Zod schemas are used extensively for type safety and to guide the AI model on its response format, ensuring model answers are judgeable (serving as general examples of strong answers) and rubrics offer a broad yet deeply contextual perspective for evaluation.

## 5. Workflow

1.  **Input Submission**:
    *   User navigates to `src/app/page.tsx` and sees `JobDescriptionForm.tsx`.
    *   User pastes the job description, optionally pastes the candidate's resume, and provides any additional candidate experience context.

2.  **Initial Kit Generation**:
    *   `handleGenerateKit` in `page.tsx` calls `generateInterviewKit` flow with all provided inputs.
    *   AI returns structured data after *deeply analyzing the context*.
    *   Response is mapped to `InterviewKit` client type (generating client IDs, setting default score to 5 for 1-10 slider, applying default times based on difficulty if needed).
    *   `interviewKit` state is updated.

3.  **Display and Interaction**:
    *   `InterviewKitDisplay.tsx` renders the kit.
    *   `CompetencyAccordion.tsx` shows competencies. Questions within each competency are grouped under "Technical Questions" and "Non-Technical Questions" headings based on their `category`.
    *   `QuestionEditorCard.tsx` displays each question, allowing edits to:
        *   Text, model answer.
        *   Category (dropdown: Technical/Non-Technical).
        *   Difficulty (dropdown: Naive to Master; changing this auto-updates estimated time to 2/4/6/8/10 mins).
        *   Estimated time (editable number input).
        *   Panelist score (1-10 slider and number input).
        *   Panelist notes.
    *   `RubricEditor.tsx` displays rubric criteria for editing.

4.  **Kit Customization & Refinement**:
    *   User modifies the kit. Changes update local `interviewKit` state.
    *   User clicks "Update & Regenerate Kit with Edits."
    *   `handleCustomizeKit` in `page.tsx` calls `customizeInterviewKit` flow with current client kit data (including JD, resume, context).
    *   AI refines the kit, again based on *deep contextual analysis of all inputs and edits*.
    *   Response is mapped back, preserving user scores/notes and applying defaults for new AI fields if necessary.
    *   `interviewKit` state is updated.

## 6. Running the Application

1.  **Install Dependencies**: `npm install`
2.  **Run Development Server**: `npm run dev` (Next.js on `http://localhost:9002`)
3.  **Run Genkit Server** (optional): `npm run genkit:dev` (Genkit UI on `http://localhost:4000`)

## 7. Potential Future Enhancements

*   User Authentication & Database Integration.
*   Export Options (PDF, DOCX).
*   Interview Mode UI.
*   More granular AI regeneration (e.g., single question).

This report provides a comprehensive overview of the RecruTake application, reflecting the latest feature enhancements and AI prompting strategies.

    