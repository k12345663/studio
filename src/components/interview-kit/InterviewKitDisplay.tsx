
"use client";

import type { InterviewKit, ClientCompetency, ClientRubricCriterion } from '@/types/interview-kit';
import { CompetencyAccordion } from './CompetencyAccordion';
import { RubricEditor } from './RubricEditor';
import { Button } from '@/components/ui/button';
import { RefreshCcw, ListChecks, Percent } from 'lucide-react';
import type React from 'react';

interface InterviewKitDisplayProps {
  kit: InterviewKit;
  onKitChange: (updatedKit: InterviewKit) => void;
  onCustomizeKit: () => Promise<void>;
  isLoading: boolean;
}

export function InterviewKitDisplay({ kit, onKitChange, onCustomizeKit, isLoading }: InterviewKitDisplayProps) {
  const handleCompetencyChange = (updatedCompetency: ClientCompetency, competencyIndex: number) => {
    const newCompetencies = [...kit.competencies];
    newCompetencies[competencyIndex] = updatedCompetency;
    onKitChange({ ...kit, competencies: newCompetencies });
  };

  const handleRubricChange = (updatedRubric: ClientRubricCriterion[]) => {
    onKitChange({ ...kit, scoringRubric: updatedRubric });
  };

  return (
    <div className="space-y-10 mt-8">
      <div>
        <div className="flex items-center mb-5">
          <ListChecks className="mr-3 h-7 w-7 text-primary" />
          <h2 className="text-3xl font-headline font-bold text-foreground tracking-tight">
            Core Competencies & Questions
          </h2>
        </div>
        <CompetencyAccordion
          competencies={kit.competencies}
          onCompetencyChange={handleCompetencyChange}
          isLoading={isLoading}
        />
      </div>
      
      <div>
         <div className="flex items-center mb-5">
            <Percent className="mr-3 h-7 w-7 text-accent" />
            <h2 className="text-3xl font-headline font-bold text-foreground tracking-tight">
              Scoring Rubric
            </h2>
        </div>
        <RubricEditor
          rubricCriteria={kit.scoringRubric}
          onRubricChange={handleRubricChange}
          isLoading={isLoading}
        />
      </div>

      <div className="mt-10 pt-8 border-t border-border flex justify-end">
        <Button onClick={onCustomizeKit} disabled={isLoading} size="lg" className="text-base py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <RefreshCcw className="mr-2 h-5 w-5" />
          {isLoading ? 'Updating Kit...' : 'Update & Regenerate Kit with Edits'}
        </Button>
      </div>
    </div>
  );
}
