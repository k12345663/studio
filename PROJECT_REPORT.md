
# RecruTake: Project Report

## 1. Overview

RecruTake is a Next.js web application designed to assist recruiters and hiring managers by leveraging AI to generate and customize comprehensive interview kits. Users can input a job description and optionally provide context about the target candidate's experience level. The application will then produce a structured set of competencies, interview questions (technical, scenario-based, behavioral) with model answers, a 5-level difficulty rating ('Naive', 'Beginner', 'Intermediate', 'Expert', 'Master'), estimated answering times, and a weighted scoring rubric that is contextually derived from the job details. Users can then edit this kit and have the AI refine their changes.

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

*   **`src/app/page.tsx`**: The main entry point for the application's UI. It handles state for the job description, candidate experience context, the generated interview kit, loading states, and orchestrates calls to AI flows.
*   **`src/ai/flows/`**: Contains the Genkit flows.
    *   **`generate-interview-kit.ts`**: Defines the AI flow for generating an interview kit from a job description and candidate experience context. It includes Zod schemas for input and output, and the prompt for the AI model, including instructions for the 5-level difficulty scale and concise model answers.
    *   **`customize-interview-kit.ts`**: Defines the AI flow for taking a user-modified interview kit and refining it using AI. It also uses Zod schemas and a specific prompt, accounting for the 5-level difficulty and experience context.
*   **`src/ai/genkit.ts`**: Initializes Genkit with the Google AI plugin and configures the default model (Gemini 2.0 Flash).
*   **`src/components/interview-kit/`**: Houses all components related to displaying and editing the interview kit, such as:
    *   `JobDescriptionForm.tsx`: For user input of the job description (text-based) and optional candidate experience context.
    *   `InterviewKitDisplay.tsx`: The main component for showing the generated kit.
    *   `CompetencyAccordion.tsx`: Displays competencies and their questions in an accordion.
    *   `QuestionEditorCard.tsx`: Allows editing individual questions, their model answers, 5-level difficulty, estimated time, etc.
    *   `RubricEditor.tsx`: Allows editing scoring rubric criteria and weights.
*   **`src/types/interview-kit.ts`**: Defines the TypeScript interfaces for `ClientQuestion`, `ClientCompetency`, `ClientRubricCriterion`, and `InterviewKit`, including the 5-level `QuestionDifficulty` and optional `candidateExperienceContext`.
*   **`src/app/globals.css`**: Contains global CSS, Tailwind directives, and the HSL color variables for theming.

## 4. AI Integration

AI capabilities are central to RecruTake and are implemented using **Genkit**.

*   **Genkit Setup (`src/ai/genkit.ts`)**:
    *   Genkit is initialized with the `googleAI` plugin, enabling access to Google's AI models.
    *   The default model is set to `googleai/gemini-2.0-flash`.

*   **Core AI Flows (`src/ai/flows/`)**:
    1.  **`generateInterviewKit`**:
        *   **Input**: `jobDescription` (string, pasted by the user), `candidateExperienceContext` (optional string, e.g., "junior developer, 2 years exp").
        *   **Process**:
            *   A detailed prompt instructs the AI (Gemini model) to act as a senior hiring manager.
            *   The AI identifies 5-7 core competencies from the job description, assigning importance (High, Medium, Low).
            *   For each competency, it generates 3 types of questions: Technical, Scenario-based, and Behavioral (STAR method), tailored to the candidate's experience context.
            *   For each question, it provides a basic, clear, and easy-to-judge model answer, a difficulty level ('Naive', 'Beginner', 'Intermediate', 'Expert', 'Master'), and an estimated time in minutes.
            *   It also generates a scoring rubric with 4-5 weighted criteria (summing to 1.0), with contextual understanding of the job title and description.
        *   **Output Schema (`GenerateInterviewKitOutputSchema` using Zod)**: A structured JSON object containing competencies (with questions, answers, types, difficulty, time, importance) and the scoring rubric. Zod descriptions in the schema guide the AI on the expected output format.
        *   **Error Handling**: Basic error checking ensures the AI output is not empty. Post-processing normalizes rubric weights to sum to 1.0 and sets default difficulty to 'Intermediate'.

    2.  **`customizeInterviewKit`**:
        *   **Input**: `jobDescription` (string), `candidateExperienceContext` (optional string), `competencies` (array of potentially user-edited competencies, including IDs, importance, questions with IDs, 5-level difficulty, time), and `rubricCriteria` (array of potentially user-edited criteria with weights).
        *   **Process**:
            *   The prompt instructs the AI to review the recruiter's edits to an existing kit, considering the original job description and candidate experience context.
            *   It must preserve existing IDs for competencies and questions.
            *   It refines modified question text/answers, ensuring quality and relevance, and model answers are basic and clear.
            *   It reflects changes to importance, difficulty (5 levels), or time, and assigns these if new questions seem to be implicitly added.
            *   It reflects changes to rubric criteria and ensures weights sum to 1.0, adjusting logically if needed, and ensuring criteria are contextually relevant.
            *   It ensures all output fields are present.
        *   **Output Schema (`CustomizeInterviewKitOutputSchema` using Zod)**: A refined version of the interview kit.
        *   **Error Handling & Validation**: Includes logic to ensure output fields are present and rubric weights are normalized. Default difficulty is 'Intermediate'.

*   **Schema Enforcement**: Zod schemas are used extensively to define the expected structure of inputs and outputs for AI flows. This is crucial for:
    *   Type safety in TypeScript.
    *   Providing a clear contract for the AI model on how to format its response.

## 5. Workflow

The primary user workflow is as follows:

1.  **Job Description & Context Input**:
    *   The user navigates to the main page (`src/app/page.tsx`).
    *   They are presented with the `JobDescriptionForm.tsx`.
    *   The user pastes the job description into the `Textarea`.
    *   Optionally, the user provides text describing the target candidate's experience level or background in another `Textarea`.

2.  **Initial Kit Generation**:
    *   Upon submission, the `handleGenerateKit` function in `page.tsx` is called.
    *   `isLoading` state is set to `true`.
    *   The `generateInterviewKit` flow (`src/ai/flows/generate-interview-kit.ts`) is invoked with the job description and candidate experience context.
    *   The flow communicates with the Gemini AI model.
    *   The AI processes the prompt and returns the structured interview kit data.
    *   The response is mapped from the AI output schema to the client-side `InterviewKit` type (this includes generating unique client-side IDs for new items and storing the experience context).
    *   The `interviewKit` state is updated, and `isLoading` is set to `false`.
    *   A success toast notification is displayed. If an error occurs, an error toast is shown.
    *   If no kit is generated yet, but a job description has been entered, a preview of the job description and context is shown.

3.  **Display and Interaction**:
    *   The `InterviewKitDisplay.tsx` component renders the generated kit.
    *   `CompetencyAccordion.tsx` shows competencies, allowing expansion to view questions.
    *   `QuestionEditorCard.tsx` displays each question, model answer, 5-level difficulty (Naive, Beginner, Intermediate, Expert, Master), estimated time, and allows editing of these fields, plus panelist score and notes.
    *   `RubricEditor.tsx` displays the scoring rubric, allowing edits to criteria names and weights. Total weight is displayed and highlighted if not equal to 1.0.

4.  **Kit Customization & Refinement**:
    *   The user modifies the generated kit directly in the UI (e.g., changes question text, model answers, rubric weights, importance, difficulty, time).
    *   These changes update the local `interviewKit` state in `page.tsx` via `onKitChange` and specific handlers (`handleCompetencyChange`, `handleRubricChange`).
    *   The user clicks the "Update & Regenerate Kit with Edits" button.
    *   The `handleCustomizeKit` function in `page.tsx` is called.
    *   `isLoading` state is set to `true`.
    *   The current client-side `interviewKit` (including candidate experience context) is mapped to the `CustomizeInterviewKitInput` schema.
    *   The `customizeInterviewKit` flow (`src/ai/flows/customize-interview-kit.ts`) is invoked.
    *   The flow sends the user-modified data, original job description, and candidate experience context to the AI for refinement.
    *   The AI processes the prompt, aiming to enhance the user's edits while maintaining structure and quality.
    *   The refined kit is returned.
    *   The response is mapped back to the client-side `InterviewKit` type, carefully merging AI changes with existing client-side data like scores and notes, and preserving the experience context.
    *   The `interviewKit` state is updated, and `isLoading` is set to `false`.
    *   A success toast notification is shown.

5.  **Loading and Feedback**:
    *   `LoadingIndicator.tsx` provides visual feedback during AI operations.
    *   `useToast` hook and `Toaster` component manage and display notifications for success or errors.

## 6. Running the Application

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Configure Environment Variables** (if any, typically in `.env` for API keys - Google AI key is usually implicitly handled by Genkit if gcloud CLI is configured or via `GOOGLE_API_KEY` env var).
3.  **Run the Development Server for Next.js**:
    ```bash
    npm run dev
    ```
    This starts the Next.js application, usually on `http://localhost:9002`.
4.  **Run the Genkit Development Server** (optional, for separate flow testing/inspection if needed):
    ```bash
    npm run genkit:dev
    # or for watching changes
    npm run genkit:watch
    ```
    This typically starts the Genkit developer UI on `http://localhost:4000`.

## 7. Potential Future Enhancements

*   **User Authentication**: To allow users to save and manage their interview kits.
*   **Database Integration**: To persist interview kits and user data.
*   **Export Options**: Allow exporting the interview kit (e.g., to PDF, DOCX).
*   **Version History**: Track changes to interview kits.
*   **Team Collaboration**: Features for teams to share and work on interview kits together.
*   **More Granular AI Controls**: Allow users to regenerate specific questions or sections rather than the whole kit during customization.
*   **Interview Mode**: A dedicated UI for conducting the interview, marking scores, and taking notes in real-time.
*   **Candidate Comparison**: Tools to compare feedback across multiple candidates for the same role.

This report provides a comprehensive overview of the RecruTake application as of its current state.
