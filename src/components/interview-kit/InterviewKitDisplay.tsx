"use client";

import type { InterviewKit, ClientCompetency, ClientRubricCriterion } from '@/types/interview-kit';
import { CompetencyAccordion } from './CompetencyAccordion';
import { RubricEditor } from './RubricEditor';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';
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
    <div className="space-y-8 mt-8">
      <div>
        <h2 className="text-2xl font-headline font-semibold mb-4 text-foreground">
          Core Competencies & Questions
        </h2>
        <CompetencyAccordion
          competencies={kit.competencies}
          onCompetencyChange={handleCompetencyChange}
          isLoading={isLoading}
        />
      </div>
      
      <div>
        <h2 className="text-2xl font-headline font-semibold mb-4 text-foreground">
          Scoring Rubric
        </h2>
        <RubricEditor
          rubricCriteria={kit.scoringRubric}
          onRubricChange={handleRubricChange}
          isLoading={isLoading}
        />
      </div>

      <div className="mt-8 pt-6 border-t border-border flex justify-end">
        <Button onClick={onCustomizeKit} disabled={isLoading} size="lg" className="text-base">
          <RefreshCcw className="mr-2 h-5 w-5" />
          {isLoading ? 'Updating Kit...' : 'Update & Regenerate Kit with Edits'}
        </Button>
      </div>
    </div>
  );
}
