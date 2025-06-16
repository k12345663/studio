
# RecruTake: AI-Powered Interview Kit Generator

RecruTake is a Next.js web application designed to assist recruiters and hiring managers by leveraging AI to generate and customize comprehensive interview kits. Users can input a job description by pasting text, optionally paste a candidate's resume, and provide additional context about the target candidate's experience level (e.g., years of experience, current role, past tech stack). The application will then produce a structured set of competencies, interview questions (categorized as Technical or Non-Technical), model answers (formatted as 3-4 concise, judgeable bullet points explicitly referencing JD/resume/context), a 5-level difficulty rating ('Naive', 'Beginner', 'Intermediate', 'Expert', 'Master'), estimated answering times (auto-suggested based on difficulty), and a weighted scoring rubric (contextually derived from JD/resume/context for comprehensive evaluation). Users can edit this kit and have the AI refine their changes. Panelists use a 1-10 score slider.

## Tech Stack

*   **Frontend Framework**: Next.js 15 (App Router)
*   **Language**: TypeScript
*   **UI Components**: ShadCN UI
*   **Styling**: Tailwind CSS (`src/app/globals.css` for theme)
*   **AI Integration**: Genkit (Google's Gemini models). Prompts are designed for:
    *   Thoroughly analyzing and synthesizing Job Description, Candidate Resume, and Candidate Context.
    *   Generating questions with categories (Technical/Non-Technical).
    *   Producing concise 3-4 judgeable bullet model answers explicitly referencing JD/resume/context, serving as general examples of strong answers.
    *   Using a 5-level difficulty scale ('Naive' to 'Master') with auto-suggested times (2/4/6/8/10 mins).
    *   Creating scoring rubrics with criteria explicitly referencing key phrases from JD/resume/context for a broad yet deeply contextual evaluation.
*   **State Management**: React state (`useState`, `useCallback`), `useToast`.
*   **Form Handling**: Standard React forms.
*   **Package Manager**: npm

## Project Structure

```
.
├── public/                     # Static assets
├── src/
│   ├── ai/                     # AI-related logic
│   │   ├── flows/              # Genkit flows (generate & customize kit)
│   │   └── genkit.ts           # Genkit initialization
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # Main application page
│   │   ├── layout.tsx          # Root layout
│   │   └── globals.css         # Global styles & theme
│   ├── components/
│   │   ├── common/             # General components (LoadingIndicator)
│   │   ├── interview-kit/      # Kit-specific components (JobDescriptionForm, CompetencyAccordion, QuestionEditorCard, RubricEditor)
│   │   ├── layout/             # Layout components (AppHeader)
│   │   └── ui/                 # ShadCN UI components
│   ├── hooks/                  # Custom React hooks (useToast)
│   ├── lib/                    # Utility functions
│   ├── types/                  # TypeScript definitions (interview-kit.ts for core structures)
├── .env
├── components.json             # ShadCN UI config
├── next.config.ts
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── PROJECT_REPORT.md           # Detailed project report
└── README.md                   # This file
```

**Key Files & Features:**

*   **`src/app/page.tsx`**: Manages main state, calls AI flows.
*   **`src/ai/flows/`**: Genkit flows for initial generation and AI-assisted customization of interview kits. Prompts instruct the AI to deeply understand and synthesize all provided inputs (JD, resume, context) to generate questions with categories, 5-level difficulty, judgeable bullet-point model answers explicitly referencing context, and context-aware rubrics for comprehensive evaluation.
*   **`src/components/interview-kit/JobDescriptionForm.tsx`**: Text input for JD, candidate resume (optional), and additional candidate experience context.
*   **`src/components/interview-kit/CompetencyAccordion.tsx`**: Displays competencies with questions grouped into "Technical" and "Non-Technical" sections.
*   **`src/components/interview-kit/QuestionEditorCard.tsx`**: UI for editing questions, model answers, category, 5-level difficulty (with auto-time), estimated time, and 1-10 panelist score.
*   **`src/types/interview-kit.ts`**: Defines core data types, including `QuestionCategory`, 5-level `QuestionDifficulty`, `candidateResume`, and `difficultyTimeMap`.

## Getting Started

1.  **Install Dependencies**: `npm install`
2.  **Environment Variables**: Configure if needed (e.g., `GOOGLE_API_KEY` for Genkit, often handled by gcloud CLI).
3.  **Run Next.js Dev Server**: `npm run dev` (App on `http://localhost:9002`)
4.  **Run Genkit Dev Server** (optional): `npm run genkit:dev` (Genkit UI `http://localhost:4000`)

Refer to `PROJECT_REPORT.md` for a more detailed breakdown.

