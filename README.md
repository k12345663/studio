
# RecruTake: AI-Powered Interview Kit Generator

RecruTake is a Next.js web application designed to assist recruiters and hiring managers by leveraging AI to generate and customize comprehensive interview kits. Users can input a job description by pasting text, optionally paste a candidate's resume (including project details, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and work history, which is deeply analyzed by the AI as a primary source), and provide additional context about the target candidate's experience level (e.g., years of experience, current role, past tech stack). The application will then produce a structured set of competencies and interview questions, generated in a logical sequence (general intro, academics, experience, then project-specifics and other technicals). Questions are categorized as Technical or Non-Technical, and directly derived from analyzing the resume's projects/skills/past experiences including their specifics like tech stack, goals, accomplishments, challenges, educational background, academic achievements, and JD requirements. Includes a "Tell me about yourself" question with a resume-tailored model answer considering education and academic background. Model answers are formatted as 3-4 concise, judgeable bullet points serving as general examples of strong answers from an interviewer's perspective by highlighting key points a candidate should cover, explicitly referencing JD/resume/projects/education/context including specific project details, educational background, and past work experiences, reflecting candidate's work and past experiences. The kit includes a 5-level difficulty rating ('Naive', 'Beginner', 'Intermediate', 'Expert', 'Master'), estimated answering times (auto-suggested based on difficulty), and a weighted scoring rubric with criteria that are well-defined, distinct, high-quality, actionable, measurable, and contextually derived from JD/resume/projects/education/context (including specific project details, educational background, and past work experiences for comprehensive evaluation, with criteria weights summing to 1.0). Users can edit this kit and have the AI refine their changes. Panelists use a 1-10 score slider for individual questions. An overall interview score (average of question scores) is also displayed.

## Tech Stack

*   **Frontend Framework**: Next.js 15 (App Router)
*   **Language**: TypeScript
*   **UI Components**: ShadCN UI
*   **Styling**: Tailwind CSS (`src/app/globals.css` for theme)
*   **AI Integration**: Genkit (Google's Gemini models). Prompts are designed for:
    *   Critically analyzing and synthesizing Job Description (primary source), Candidate Resume (primary source, including specific projects, their tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), and Candidate Experience Context. The AI is instructed to thoroughly understand all user-provided details before generating content.
    *   Generating questions in a logical sequence: starting with an introductory competency (e.g., "Candidate Introduction & Background") containing "Tell me about yourself", academic background, and general experience questions. This is followed by other competencies focusing on project deep-dives and then other technical/scenario/behavioral questions.
    *   Generating questions with categories (Technical/Non-Technical) by directly probing resume details (including projects, their specifics like tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past experiences) and JD requirements. This includes a "Tell me about yourself" question with a model answer tailored to the candidate's specific resume (considering their work history, projects, and educational background).
    *   Producing concise 3-4 judgeable bullet model answers that serve as general examples of strong answers from an interviewer's perspective by highlighting key points a candidate should cover, explicitly referencing JD/resume/projects/education/context (including specific project details, educational background, and past work experiences), reflecting the candidate's work and past experiences.
    *   Using a 5-level difficulty scale ('Naive' to 'Master') with auto-suggested times (2/4/6/8/10 mins).
    *   Creating scoring rubrics with well-defined, distinct, high-quality, actionable, measurable criteria explicitly referencing key phrases from JD/resume/projects/education/context (including specific project details, educational background, and past work experiences) for a broad yet deeply contextual evaluation. Rubric criteria weights sum to 1.0.
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
│   │   ├── interview-kit/      # Kit-specific components (JobDescriptionForm, CompetencyAccordion, QuestionEditorCard, RubricEditor, InterviewKitDisplay)
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

*   **`src/app/page.tsx`**: Manages main state, calls AI flows. Features a welcome screen (no placeholder image).
*   **`src/ai/flows/`**: Genkit flows for initial generation and AI-assisted customization of interview kits. Prompts instruct the AI to deeply understand and synthesize all provided inputs (JD as primary source, resume with project details including tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences as primary source, context) to generate questions in a logical sequence (intro, academics, experience, projects, technicals). Includes resume-project specific questions and a resume-tailored "Tell me about yourself" based on their work history, projects, and education. Generates categories, 5-level difficulty, judgeable bullet-point model answers (serving as general examples of strong answers from an interviewer's perspective by highlighting key points a candidate should cover, reflecting candidate's work and past experiences, explicitly referencing context including resume projects, their specifics like tech stack, goals, accomplishments, challenges, and educational background), and context-aware, well-defined, high-quality rubrics (weights summing to 1.0) for comprehensive evaluation (explicitly referencing project details, educational background, and past work experiences).
*   **`src/components/interview-kit/JobDescriptionForm.tsx`**: Text input for JD, candidate resume (optional, including project details, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and work history, key for AI tailoring), and additional candidate experience context.
*   **`src/components/interview-kit/InterviewKitDisplay.tsx`**: Renders the generated kit and displays the "Overall Interview Score."
*   **`src/components/interview-kit/CompetencyAccordion.tsx`**: Displays competencies with questions grouped into "Technical" and "Non-Technical" sections.
*   **`src/components/interview-kit/QuestionEditorCard.tsx`**: UI for editing questions, model answers, category, 5-level difficulty (with auto-time), estimated time, and 1-10 panelist score.
*   **`src/components/interview-kit/RubricEditor.tsx`**: UI for editing rubric criteria (must be well-defined, distinct, high-quality, actionable, measurable, contextually based on resume project specifics like tech stack, goals, accomplishments, challenges, educational background, and past work experiences) and their weights (which sum to 1.0).
*   **`src/types/interview-kit.ts`**: Defines core data types, including `QuestionCategory`, 5-level `QuestionDifficulty`, `candidateResume`, `ClientRubricCriterion` (with weights), and `difficultyTimeMap`. Individual question scores are 1-10.

## Getting Started

1.  **Install Dependencies**: `npm install`
2.  **Environment Variables**: Configure if needed (e.g., `GOOGLE_API_KEY` for Genkit, often handled by gcloud CLI).
3.  **Run Next.js Dev Server**: `npm run dev` (App on `http://localhost:9002`)
4.  **Run Genkit Dev Server** (optional): `npm run genkit:dev` (Genkit UI `http://localhost:4000`)

Refer to `PROJECT_REPORT.md` for a more detailed breakdown.
    
