"use client";

import type { ClientQuestion } from '@/types/interview-kit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Wrench, Puzzle, Users, HelpCircle, AlertTriangle, CheckCircle, Clock3 } from 'lucide-react';
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

const DifficultyBadge: React.FC<{ difficulty: ClientQuestion['difficulty'] }> = ({ difficulty }) => {
  let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
  let icon: React.ReactNode = null;

  switch (difficulty) {
    case 'Hard':
      variant = "destructive";
      icon = <AlertTriangle className="h-3 w-3 mr-1" />;
      break;
    case 'Medium':
      variant = "default"; // Using primary color for medium
      icon = <CheckCircle className="h-3 w-3 mr-1" />;
      break;
    case 'Easy':
      variant = "secondary"; // Muted or secondary for easy
      break;
  }
  return <Badge variant={variant} className="text-xs px-1.5 py-0.5">{icon}{difficulty}</Badge>;
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

  const handleDifficultyChange = (value: ClientQuestion['difficulty']) => {
    onQuestionChange({ ...question, difficulty: value });
  };

  const handleTimeChange = (value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >=0) {
      onQuestionChange({ ...question, estimatedTimeMinutes: numValue });
    } else if (value === "") {
       onQuestionChange({ ...question, estimatedTimeMinutes: 0 });
    }
  };


  const uniqueIdPrefix = `competency-${competencyName.replace(/\s+/g, '-').toLowerCase()}-q${questionIndex}`;

  return (
    <Card className="mb-4 shadow-md bg-card/80 backdrop-blur-sm border border-border">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold flex items-center">
            {getQuestionTypeIcon(question.type)}
            Question {questionIndex + 1}
          </CardTitle>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
            <DifficultyBadge difficulty={question.difficulty} />
            <Badge variant="outline" className="text-xs px-1.5 py-0.5 flex items-center">
              <Clock3 className="h-3 w-3 mr-1" />
              {question.estimatedTimeMinutes} min
            </Badge>
            <Badge variant="outline" className="text-sm">{question.type}</Badge>
          </div>
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
           <div>
            <Label htmlFor={`${uniqueIdPrefix}-difficulty`} className="font-medium">Difficulty</Label>
            <select
                id={`${uniqueIdPrefix}-difficulty`}
                value={question.difficulty}
                onChange={(e) => handleDifficultyChange(e.target.value as ClientQuestion['difficulty'])}
                disabled={isLoading}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-input border rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm bg-background"
                aria-label={`Difficulty for question ${questionIndex + 1}`}
            >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
            </select>
          </div>
          <div>
            <Label htmlFor={`${uniqueIdPrefix}-time`} className="font-medium">Est. Time (min)</Label>
            <Input
              id={`${uniqueIdPrefix}-time`}
              type="number"
              value={question.estimatedTimeMinutes}
              onChange={(e) => handleTimeChange(e.target.value)}
              min={0}
              className="mt-1 text-sm"
              disabled={isLoading}
              aria-label={`Estimated time for question ${questionIndex + 1}`}
            />
          </div>
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
