
# RecruTake: AI-Powered Interview Kit Generator

RecruTake is a Next.js web application designed to assist recruiters and hiring managers by leveraging AI to generate and customize comprehensive interview kits. Users can input a job description by pasting text, and optionally provide context about the target candidate's experience level. The application will produce a structured set of competencies, interview questions (technical, scenario-based, behavioral) with model answers, a 5-level difficulty rating, estimated answering times, and a weighted scoring rubric. Users can then edit this kit and have the AI refine their changes.

## Tech Stack

The application is built with a modern, server-centric approach:

*   **Frontend Framework**: Next.js 15 (using the App Router)
*   **Language**: TypeScript
*   **UI Components**: ShadCN UI - A collection of re-usable UI components.
*   **Styling**: Tailwind CSS - A utility-first CSS framework for rapid UI development. Global styles and theme variables (CSS HSL) are managed in `src/app/globals.css`.
*   **AI Integration**: Genkit - An open-source framework from Google for building AI-powered applications. It's used here to connect to Google's Gemini models. AI prompts are designed to generate questions tailored to candidate experience, provide concise model answers, and use a 5-level difficulty scale.
*   **State Management**: Primarily React's built-in state (`useState`, `useCallback`) and context where appropriate (e.g., `useToast`).
*   **Form Handling**: Standard React form handling.
*   **Linting/Formatting**: ESLint, Prettier (implicitly, through Next.js defaults).
*   **Package Manager**: npm

## Project Structure

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
├── PROJECT_REPORT.md           # Detailed project report
└── README.md                   # This file
```

**Key Directories & Files:**

*   **`src/app/page.tsx`**: The main entry point for the application's UI. It handles state for the job description, candidate experience context, the generated interview kit, loading states, and orchestrates calls to AI flows.
*   **`src/ai/flows/`**: Contains the Genkit flows.
    *   **`generate-interview-kit.ts`**: Defines the AI flow for generating an interview kit from a job description and candidate experience context.
    *   **`customize-interview-kit.ts`**: Defines the AI flow for refining a user-modified interview kit, considering experience context and the 5-level difficulty scale.
*   **`src/ai/genkit.ts`**: Initializes Genkit with the Google AI plugin.
*   **`src/components/interview-kit/`**: Houses components for displaying and editing the interview kit (e.g., `JobDescriptionForm.tsx` for text and experience input, `QuestionEditorCard.tsx` for 5-level difficulty).
*   **`src/types/interview-kit.ts`**: Defines core TypeScript interfaces for the application, including the 5-level `QuestionDifficulty` and optional `candidateExperienceContext`.
*   **`src/app/globals.css`**: Contains global CSS, Tailwind directives, and theme variables.

## Getting Started

To get started with development:

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Configure Environment Variables** (if needed, e.g., `GOOGLE_API_KEY` for Genkit, though often handled by gcloud CLI setup). Create a `.env` file from `.env.example` if provided.
3.  **Run the Next.js Development Server**:
    ```bash
    npm run dev
    ```
    The application will typically be available at `http://localhost:9002`.
4.  **Run the Genkit Development Server** (optional, for inspecting/testing flows separately):
    ```bash
    npm run genkit:dev
    ```
    The Genkit developer UI is usually on `http://localhost:4000`.

Refer to `PROJECT_REPORT.md` for a more detailed breakdown of the application, including AI integration specifics and workflow.
