
export interface ClientQuestion {
  id: string;
  type: 'Technical' | 'Scenario' | 'Behavioral';
  text: string;
  modelAnswer: string;
  score: number;
  notes: string;
}

export interface ClientCompetency {
  id: string;
  name: string;
  questions: ClientQuestion[];
}

export interface ClientRubricCriterion {
  id: string;
  name: string;
  weight: number;
}

export interface InterviewKit {
  jobDescription: string;
  competencies: ClientCompetency[];
  scoringRubric: ClientRubricCriterion[];
}

// Helper function to generate unique IDs
export const generateId = (prefix: string = 'id') => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};
