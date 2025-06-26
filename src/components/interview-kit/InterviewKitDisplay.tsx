
"use client";

import type { InterviewKit, ClientCompetency, ClientRubricCriterion, ClientQuestion } from '@/types/interview-kit';
import { CompetencyAccordion } from './CompetencyAccordion';
import { RubricEditor } from './RubricEditor';
import { Button } from '@/components/ui/button';
import { RefreshCcw, ListChecks, Percent, BarChart3, Star } from 'lucide-react';
import type React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

  const calculateOverallScore = (): { score: number | null; totalQuestions: number } => {
    let totalQuestionsScore = 0;
    let questionCount = 0;

    kit.competencies.forEach(comp => {
      comp.questions.forEach(q => {
        const questionScore = q.modelAnswerPoints.reduce((acc, point) => {
          return point.isChecked ? acc + point.points : acc;
        }, 0);
        totalQuestionsScore += questionScore;
        questionCount++;
      });
    });

    if (questionCount === 0) return { score: null, totalQuestions: 0 };
    return { score: parseFloat((totalQuestionsScore / questionCount).toFixed(2)), totalQuestions: questionCount };
  };

  const { score: overallScore, totalQuestions } = calculateOverallScore();

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

      {totalQuestions > 0 && (
        <Card className="shadow-xl border-primary/20">
          <CardHeader>
            <CardTitle className="font-headline text-2xl text-primary flex items-center">
              <BarChart3 className="mr-3 h-7 w-7" /> Overall Interview Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overallScore !== null ? (
              <div className="text-4xl font-bold text-foreground flex items-center">
                <Star className="mr-2 h-8 w-8 text-yellow-400 fill-yellow-400" />
                {overallScore.toFixed(1)} / 10
              </div>
            ) : (
              <p className="text-muted-foreground">No scores entered yet.</p>
            )}
            <p className="text-sm text-muted-foreground mt-1">Based on {totalQuestions} scored question(s).</p>
          </CardContent>
        </Card>
      )}

      <div className="mt-10 pt-8 border-t border-border flex justify-end">
        <Button onClick={onCustomizeKit} disabled={isLoading} size="lg" className="text-base py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <RefreshCcw className="mr-2 h-5 w-5" />
          {isLoading ? 'Updating Kit...' : 'Update & Regenerate Kit with Edits'}
        </Button>
      </div>
    </div>
  );
}
