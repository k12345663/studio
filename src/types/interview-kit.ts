
export type QuestionType = 'Technical' | 'Scenario' | 'Behavioral';
export type QuestionDifficulty = 'Naive' | 'Beginner' | 'Intermediate' | 'Expert' | 'Master';
export type CompetencyImportance = 'High' | 'Medium' | 'Low';
export type QuestionCategory = 'Technical' | 'Non-Technical';

export interface ClientQuestion {
  id: string;
  type: QuestionType;
  category: QuestionCategory;
  text: string;
  modelAnswer: string;
  score: number; // Will be 1-10
  notes: string;
  difficulty: QuestionDifficulty;
  estimatedTimeMinutes: number;
}

export interface ClientCompetency {
  id: string;
  name: string;
  importance: CompetencyImportance;
  questions: ClientQuestion[];
}

export interface ClientRubricCriterion {
  id: string;
  name: string;
  weight: number;
}

export interface InterviewKit {
  jobDescription: string;
  unstopProfileLink?: string; // Added, conceptually compulsory
  candidateResumeText?: string; // Renamed from candidateResume, holds extracted text
  candidateExperienceContext?: string;
  competencies: ClientCompetency[];
  scoringRubric: ClientRubricCriterion[];
}

// Helper function to generate unique IDs
export const generateId = (prefix: string = 'id') => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export const difficultyTimeMap: Record<QuestionDifficulty, number> = {
  Naive: 2,
  Beginner: 4,
  Intermediate: 6,
  Expert: 8,
  Master: 10,
};
