
"use client";

import type { ClientQuestion, QuestionDifficulty, QuestionCategory } from '@/types/interview-kit';
import { difficultyTimeMap } from '@/types/interview-kit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wrench, Puzzle, Users, HelpCircle, ThermometerSnowflake, Thermometer, Activity, Sparkles, Gem, Clock3, Tag } from 'lucide-react';
import type React from 'react'; // Ensured React is imported
import { useEffect } from 'react';


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
  let text = difficulty;

  switch (difficulty) {
    case 'Naive':
      variant = "outline";
      icon = <ThermometerSnowflake className="h-3 w-3 mr-1" />;
      break;
    case 'Beginner':
      variant = "secondary";
      icon = <Thermometer className="h-3 w-3 mr-1" />;
      break;
    case 'Intermediate':
      variant = "default"; 
      icon = <Activity className="h-3 w-3 mr-1" />;
      break;
    case 'Expert':
      return <Badge variant="default" className="text-xs px-1.5 py-0.5 bg-accent text-accent-foreground hover:bg-accent/90"><Sparkles className="h-3 w-3 mr-1" />{text}</Badge>;
    case 'Master':
      variant = "destructive";
      icon = <Gem className="h-3 w-3 mr-1" />;
      break;
    default:
      icon = <HelpCircle className="h-3 w-3 mr-1" />;
      break;
  }
  return <Badge variant={variant} className="text-xs px-1.5 py-0.5">{icon}{text}</Badge>;
};

const CategoryBadge: React.FC<{ category: QuestionCategory }> = ({ category }) => {
  const isTechnical = category === 'Technical';
  return (
    <Badge variant={isTechnical ? "default" : "secondary"} className="text-xs px-1.5 py-0.5 flex items-center">
      <Tag className="h-3 w-3 mr-1" />
      {category}
    </Badge>
  );
};


export function QuestionEditorCard({
  question,
  onQuestionChange,
  competencyName,
  questionIndex,
  isLoading = false,
}: QuestionEditorCardProps) {
  
  useEffect(() => {
    // Auto-fill estimated time when difficulty changes, if the time is currently at a default for another difficulty or 0/undefined
    const newTime = difficultyTimeMap[question.difficulty];
    const currentMappedTimeForOldDifficulty = Object.values(difficultyTimeMap).includes(question.estimatedTimeMinutes);
    
    if (question.estimatedTimeMinutes !== newTime && (currentMappedTimeForOldDifficulty || !question.estimatedTimeMinutes)) {
       onQuestionChange({ ...question, estimatedTimeMinutes: newTime });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.difficulty]);
  
  const handleInputChange = (
    field: keyof ClientQuestion,
    value: string | number
  ) => {
    onQuestionChange({ ...question, [field]: value });
  };
  
  const handleDifficultyChange = (value: ClientQuestion['difficulty']) => {
    const newTime = difficultyTimeMap[value];
    onQuestionChange({ ...question, difficulty: value, estimatedTimeMinutes: newTime });
  };

  const handleCategoryChange = (value: QuestionCategory) => {
    onQuestionChange({ ...question, category: value});
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
  const difficultyLevels: QuestionDifficulty[] = ['Naive', 'Beginner', 'Intermediate', 'Expert', 'Master'];
  const categoryLevels: QuestionCategory[] = ['Technical', 'Non-Technical'];

  return (
    <Card className="mb-4 shadow-md bg-card/80 backdrop-blur-sm border border-border">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold flex items-center">
            {getQuestionTypeIcon(question.type)}
            Question {questionIndex + 1}
          </CardTitle>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 flex-wrap">
            <CategoryBadge category={question.category} />
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
          <Label htmlFor={`${uniqueIdPrefix}-modelAnswer`} className="font-medium">Model Answer (3-4 bullet points)</Label>
          <Textarea
            id={`${uniqueIdPrefix}-modelAnswer`}
            value={question.modelAnswer}
            onChange={(e) => handleInputChange('modelAnswer', e.target.value)}
            placeholder="Enter model answer as 3-4 bullet points..."
            className="mt-1 text-sm"
            rows={4}
            disabled={isLoading}
            aria-label={`Model answer for question ${questionIndex + 1}`}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
           <div>
            <Label htmlFor={`${uniqueIdPrefix}-category`} className="font-medium">Category</Label>
             <Select
                value={question.category}
                onValueChange={(value: QuestionCategory) => handleCategoryChange(value)}
                disabled={isLoading}
              >
                <SelectTrigger id={`${uniqueIdPrefix}-category`} className="mt-1" aria-label={`Category for question ${questionIndex + 1}`}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryLevels.map(level => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>
          <div>
            <Label htmlFor={`${uniqueIdPrefix}-difficulty`} className="font-medium">Difficulty</Label>
            <Select
                value={question.difficulty}
                onValueChange={(value: QuestionDifficulty) => handleDifficultyChange(value)}
                disabled={isLoading}
              >
                <SelectTrigger id={`${uniqueIdPrefix}-difficulty`} className="mt-1" aria-label={`Difficulty for question ${questionIndex + 1}`}>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  {difficultyLevels.map(level => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Label htmlFor={`${uniqueIdPrefix}-score`} className="font-medium">Score (1-10)</Label>
            <div className="flex items-center space-x-3 mt-1">
              <Slider
                id={`${uniqueIdPrefix}-score`}
                min={1}
                max={10}
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
                onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (e.target.value === "") {
                      handleInputChange('score', 1); // Default to 1 if empty
                    } else if (!isNaN(val) && val >= 1 && val <=10) {
                      handleInputChange('score', val);
                    } else if (!isNaN(val) && val < 1) {
                      handleInputChange('score', 1);
                    } else if (!isNaN(val) && val > 10) {
                      handleInputChange('score', 10);
                    }
                }}
                min={1} max={10}
                className="w-20 text-center"
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
