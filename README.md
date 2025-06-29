# RecruTake: AI-Powered Interview Kit Generator

RecruTake is a Next.js web application designed to assist recruiters and hiring managers—especially those who **may not be technical experts** in the role's domain—by leveraging AI to generate and customize comprehensive interview kits. The AI acts as an experienced **recruiter companion (25+ years experience)**, guiding the interviewer. Users input a job description (pasted text), a **compulsory Unstop Profile Link (conceptually treated as a live data source for AI analysis)**, and can **optionally provide a candidate resume file (PDF/DOCX). The content of this resume file is converted to a data URI client-side and sent to the AI for direct analysis**, including details like projects, their tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences. The AI then produces a structured set of competencies and interview questions, generated in a logical sequence (general intro, academics, experience, then project-specifics and other technicals).

Questions are categorized as Technical or Non-Technical, and directly derived from analyzing the Unstop Profile (conceptually treated as live profile analysis) and **the content of the provided resume file (if uploaded, AI analyzes it directly via data URI)**, including projects, their tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), and JD requirements. Model answers are formatted as 3-4 concise, judgeable bullet points serving as **general examples of strong answers from an interviewer's perspective by highlighting key points a candidate should cover** (e.g., for an OOP question, noting the 4 pillars, clearly listing them), with each bullet also suggesting an indicative contribution to the question's 10-point score. These answers are designed to be **basic, clear, and easy for non-technical recruiters to evaluate** (allowing some general questions to focus on fundamental principles rather than strict JD mapping for every point), and include guidance on assessing real-life examples and relevant information shared by the candidate not present on the resume. "Tell me about yourself" model answers are interviewer-focused guides based on the Unstop profile and **resume file content (if provided)** (candidate's work history, projects, education, academic achievements), designed to help **non-technical recruiters** assess relevance.

The kit includes a 5-level difficulty rating ('Naive' to 'Master'), estimated answering times, and a weighted scoring rubric. Rubric criteria are designed for **non-technical evaluators** (focusing on clarity, relevance, depth), contextually derived from JD & Unstop profile/**resume file content (if provided, AI analyzes it directly via data URI)**, including projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), and adaptable to emergent candidate information, with weights summing to 1.0. Users can edit this kit and have the AI refine their changes. Panelists use a 1-10 score slider for individual questions. An "Overall Interview Score" (average of question scores) is also displayed.

## Tech Stack

*   **Frontend Framework**: Next.js 15 (App Router)
*   **Language**: TypeScript
*   **UI Components**: ShadCN UI
*   **Styling**: Tailwind CSS (`src/app/globals.css` for theme)
*   **AI Integration**: OpenAI API (GPT-4o). Prompts are designed for:
    *   Embodying an experienced recruiter persona (25+ years), acting as a **recruiter companion** capable of assisting **non-technical evaluation**.
    *   Critically analyzing Job Description (primary source), Unstop Profile Link (compulsory primary source, **conceptually treated as live profile analysis**), **Candidate Resume File (optional primary source, provided as data URI for direct AI analysis of its content**, including projects, tech stack, goals, accomplishments, challenges, education, academic achievements, past work experiences), and Candidate Experience Context.
    *   Generating questions in a logical sequence.
    *   Producing model answers **from an interviewer's perspective, highlighting key points to cover** (with indicative mark contributions), suitable for **non-technical judgment** (basic, clear, listing fundamentals like OOP pillars if applicable, allowing some general questions to focus on fundamental principles rather than strict JD mapping for every point), and noting how to evaluate real-life examples and relevant information shared by the candidate not present on the resume. "Tell me about yourself" model answers are specifically interviewer-focused guides based on the Unstop profile/**resume file content (if provided)** (candidate's work history, projects, education, academic achievements), designed for **non-technical recruiters**.
    *   Creating scoring rubrics with criteria focused on clarity, relevance, and depth, **usable by non-technical recruiters**, and contextually tied to JD & Unstop profile/**resume file content (if provided, AI analyzes it directly via data URI**, including projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences), while also being adaptable to emergent candidate information.
*   **State Management**: React state, `useToast`.
*   **Form Handling**: Client-side conversion of selected resume files (PDF/DOCX) to data URIs.
*   **Package Manager**: npm

## Project Structure
(Standard Next.js App Router structure - See `PROJECT_REPORT.md` for details)
```
.
├── public/
├── src/
│   ├── ai/ (OpenAI flows and utilities)
│   ├── app/ (Pages, layouts, global CSS)
│   ├── components/ (UI components, including interview kit specific ones)
│   ├── hooks/
│   ├── lib/ (OpenAI client and utilities)
│   ├── types/ (TypeScript definitions: unstopProfileLink, candidateResumeDataUri, candidateResumeFileName)
...
```

**Key Files & Features:**

*   **`src/app/page.tsx`**: Manages main state (JD, Unstop link, **candidateResumeDataUri, candidateResumeFileName** including projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences from the file, context), calls AI flows.
*   **`src/ai/flows/`**: OpenAI-based flows for generation and customization, with prompts emphasizing **recruiter-centric companion AI for non-technical evaluators**, deep analysis of JD, Unstop Profile link (compulsory, **conceptually treated as live profile analysis**), and **resume file (optional, if provided as data URI, AI directly analyzes its content including projects, tech stack, education, academic achievements, experience)**, logical question sequencing, and model answers guiding on key points to cover (basic, clear, easy to judge with indicative mark contributions, allowing some general questions to focus on fundamental principles), including guidance for evaluating emergent candidate information. "Tell me about yourself" model answers help non-technical recruiters assess relevance based on the candidate's actual profile (work history, projects, education, academic achievements from Unstop and **resume file content**).
*   **`src/lib/openai.ts`**: OpenAI client configuration and utility functions for API calls.
*   **`src/components/interview-kit/JobDescriptionForm.tsx`**: Text input for JD, **compulsory Unstop Profile Link**, optional resume file upload (PDF/DOCX, **converted client-side to data URI for direct AI analysis of its content**, prompting for details like projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences from the file), and additional context.
*   **`src/components/interview-kit/InterviewKitDisplay.tsx`**: Renders kit, displays "Overall Interview Score."
*   **`src/components/interview-kit/CompetencyAccordion.tsx`**: Groups questions by "Technical" and "Non-Technical".
*   **`src/components/interview-kit/QuestionEditorCard.tsx`**: UI for editing questions, model answers, category, difficulty, time, and 1-10 panelist score.
*   **`src/components/interview-kit/RubricEditor.tsx`**: UI for editing rubric criteria (designed for **non-technical evaluation**, context from JD & Unstop/**resume file content (if provided, AI analyzes it directly via data URI)**, including projects, tech stack, goals, accomplishments, challenges, educational background, academic achievements, and past work experiences, adaptable to new candidate info) and weights. Textarea used for longer criterion names.

## Environment Setup

1. **Install Dependencies**: `npm install`
2. **Environment Variables**: Create a `.env.local` file with:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_MODEL=gpt-4o  # Optional, defaults to gpt-4o
   OPENAI_ORGANIZATION=your_org_id_here  # Optional
   ```
3. **Run Next.js Dev Server**: `npm run dev` (App on `http://localhost:9002`)

## OpenAI API Configuration

The application uses OpenAI's GPT-4o model by default, which provides excellent performance for:
- Resume analysis and content extraction
- Job description parsing
- Interview question generation
- Model answer creation
- Scoring rubric development

The AI is specifically trained to act as an experienced recruiter companion, making it suitable for non-technical evaluators while maintaining depth and accuracy in technical assessments.

## Getting Started

1. **Get OpenAI API Key**: Sign up at [OpenAI](https://platform.openai.com/) and create an API key
2. **Install Dependencies**: `npm install`
3. **Configure Environment**: Copy `.env.example` to `.env.local` and add your OpenAI API key
4. **Run Development Server**: `npm run dev`
5. **Access Application**: Open `http://localhost:9002` in your browser

Refer to `PROJECT_REPORT.md` for a more detailed breakdown of the application architecture and features.