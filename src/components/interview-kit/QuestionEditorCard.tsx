"use client";

import type { ClientQuestion } from '@/types/interview-kit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Wrench, Puzzle, Users, HelpCircle } from 'lucide-react';
import type React from 'react';

interface QuestionEditorCardProps {
  question: ClientQuestion;
  onQuestionChange: (updatedQuestion: ClientQuestion) => void;
  competencyName: string;
  questionIndex: number;
  isLoading?: boolean;
}

const getQuestionTypeIcon = (type: ClientQuestion['type']) => {
  switch (type) {
    case 'Technical':
      return <Wrench className="h-4 w-4 mr-2 text-primary" aria-label="Technical Question" />;
    case 'Scenario':
      return <Puzzle className="h-4 w-4 mr-2 text-accent" aria-label="Scenario Question" />;
    case 'Behavioral':
      return <Users className="h-4 w-4 mr-2 text-foreground" aria-label="Behavioral Question" />;
    default:
      return <HelpCircle className="h-4 w-4 mr-2" aria-label="Generic Question" />;
  }
};


export function QuestionEditorCard({
  question,
  onQuestionChange,
  competencyName,
  questionIndex,
  isLoading = false,
}: QuestionEditorCardProps) {
  const handleInputChange = (
    field: keyof ClientQuestion,
    value: string | number
  ) => {
    onQuestionChange({ ...question, [field]: value });
  };

  const uniqueIdPrefix = `competency-${competencyName.replace(/\s+/g, '-').toLowerCase()}-q${questionIndex}`;

  return (
    <Card className="mb-4 shadow-md bg-card/80 backdrop-blur-sm border border-border">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold flex items-center">
            {getQuestionTypeIcon(question.type)}
            Question {questionIndex + 1}
          </CardTitle>
          <Badge variant="outline" className="text-sm">{question.type}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor={`${uniqueIdPrefix}-text`} className="font-medium">Question Text</Label>
          <Textarea
            id={`${uniqueIdPrefix}-text`}
            value={question.text}
            onChange={(e) => handleInputChange('text', e.target.value)}
            placeholder="Enter question text"
            className="mt-1 text-sm"
            rows={3}
            disabled={isLoading}
            aria-label={`Question text for question ${questionIndex + 1} of competency ${competencyName}`}
          />
        </div>
        <div>
          <Label htmlFor={`${uniqueIdPrefix}-modelAnswer`} className="font-medium">Model Answer</Label>
          <Textarea
            id={`${uniqueIdPrefix}-modelAnswer`}
            value={question.modelAnswer}
            onChange={(e) => handleInputChange('modelAnswer', e.target.value)}
            placeholder="Enter model answer"
            className="mt-1 text-sm"
            rows={4}
            disabled={isLoading}
            aria-label={`Model answer for question ${questionIndex + 1}`}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor={`${uniqueIdPrefix}-score`} className="font-medium">Score (1-5)</Label>
            <div className="flex items-center space-x-3 mt-1">
              <Slider
                id={`${uniqueIdPrefix}-score`}
                min={1}
                max={5}
                step={1}
                value={[question.score]}
                onValueChange={(value) => handleInputChange('score', value[0])}
                className="w-full"
                disabled={isLoading}
                aria-label={`Score for question ${questionIndex + 1}`}
              />
              <Input
                type="number"
                value={question.score}
                onChange={(e) => handleInputChange('score', parseInt(e.target.value, 10))}
                min={1} max={5}
                className="w-16 text-center"
                disabled={isLoading}
                aria-label={`Score input field for question ${questionIndex + 1}`}
              />
            </div>
          </div>
          <div>
            <Label htmlFor={`${uniqueIdPrefix}-notes`} className="font-medium">Panelist Notes</Label>
            <Textarea
              id={`${uniqueIdPrefix}-notes`}
              value={question.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Your notes during the interview..."
              className="mt-1 text-sm"
              rows={2}
              disabled={isLoading}
              aria-label={`Notes for question ${questionIndex + 1}`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
