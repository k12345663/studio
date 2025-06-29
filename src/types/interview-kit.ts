
export type QuestionType = 'Technical' | 'Scenario' | 'Behavioral';
export type QuestionDifficulty = 'Naive' | 'Beginner' | 'Intermediate' | 'Expert' | 'Master';
export type CompetencyImportance = 'High' | 'Medium' | 'Low';
export type QuestionCategory = 'Technical' | 'Non-Technical';

export interface ModelAnswerPoint {
  id: string;
  text: string;
  points: number;
  isChecked: boolean;
}

export interface ClientQuestion {
  id: string;
  type: QuestionType;
  category: QuestionCategory;
  text: string;
  modelAnswerPoints: ModelAnswerPoint[];
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
  unstopProfileLink?: string;
  unstopProfileDetails?: string;
  candidateResumeFileName?: string;
  candidateResumeDataUri?: string; // Will be undefined if not provided or if client-side processing error (null means error)
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
