
# RecruTake: AI-Powered Interview Kit Generator

RecruTake is a Next.js web application designed to assist recruiters and hiring managers by leveraging AI to generate and customize comprehensive interview kits. Users can input a job description by pasting text, and optionally provide context about the target candidate's experience level (e.g., years of experience, current role, past tech stack). The application will then produce a structured set of competencies, interview questions (categorized as Technical or Non-Technical), model answers (formatted as 3-4 concise bullet points referencing JD/context), a 5-level difficulty rating ('Naive', 'Beginner', 'Intermediate', 'Expert', 'Master'), estimated answering times (auto-suggested based on difficulty), and a weighted scoring rubric (contextually referencing JD/context). Users can edit this kit and have the AI refine their changes. Panelists use a 1-10 score slider.

## Tech Stack

*   **Frontend Framework**: Next.js 15 (App Router)
*   **Language**: TypeScript
*   **UI Components**: ShadCN UI
*   **Styling**: Tailwind CSS (`src/app/globals.css` for theme)
*   **AI Integration**: Genkit (Google's Gemini models). Prompts are designed for:
    *   Tailoring to candidate experience context.
    *   Generating questions with categories (Technical/Non-Technical).
    *   Producing concise 3-4 bullet model answers referencing JD/context.
    *   Using a 5-level difficulty scale ('Naive' to 'Master') with auto-suggested times.
    *   Creating context-aware scoring rubrics.
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
*   **`src/ai/flows/`**: Genkit flows for initial generation and AI-assisted customization of interview kits, incorporating candidate context, question categories, 5-level difficulty, bullet-point answers, and contextual rubrics.
*   **`src/components/interview-kit/JobDescriptionForm.tsx`**: Text input for JD and candidate experience context.
*   **`src/components/interview-kit/CompetencyAccordion.tsx`**: Displays competencies with questions grouped into "Technical" and "Non-Technical" sections.
*   **`src/components/interview-kit/QuestionEditorCard.tsx`**: UI for editing questions, model answers, category, 5-level difficulty (with auto-time), estimated time, and 1-10 panelist score.
*   **`src/types/interview-kit.ts`**: Defines core data types, including `QuestionCategory`, 5-level `QuestionDifficulty`, and `difficultyTimeMap`.

## Getting Started

1.  **Install Dependencies**: `npm install`
2.  **Environment Variables**: Configure if needed (e.g., `GOOGLE_API_KEY` for Genkit, often handled by gcloud CLI).
3.  **Run Next.js Dev Server**: `npm run dev` (App on `http://localhost:9002`)
4.  **Run Genkit Dev Server** (optional): `npm run genkit:dev` (Genkit UI `http://localhost:4000`)

Refer to `PROJECT_REPORT.md` for a more detailed breakdown.
