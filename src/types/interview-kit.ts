
export type QuestionType = 'Technical' | 'Scenario' | 'Behavioral';
export type QuestionDifficulty = 'Naive' | 'Beginner' | 'Intermediate' | 'Expert' | 'Master';
export type CompetencyImportance = 'High' | 'Medium' | 'Low';

export interface ClientQuestion {
  id: string;
  type: QuestionType;
  text: string;
  modelAnswer: string;
  score: number;
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
  candidateExperienceContext?: string; // Added
  competencies: ClientCompetency[];
  scoringRubric: ClientRubricCriterion[];
}

// Helper function to generate unique IDs
export const generateId = (prefix: string = 'id') => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};
