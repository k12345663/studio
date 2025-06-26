
"use client";

import type { ClientQuestion, QuestionDifficulty, QuestionCategory, ModelAnswerPoint } from '@/types/interview-kit';
import { difficultyTimeMap } from '@/types/interview-kit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Wrench, Puzzle, Users, HelpCircle, ThermometerSnowflake, Thermometer, Activity, Sparkles, Gem, Clock3, Tag, Type, MessageCircle, Star, Edit3, ListChecks, Info } from 'lucide-react';
import type React from 'react'; 
import { useEffect, useMemo } from 'react';


interface QuestionEditorCardProps {
  question: ClientQuestion;
  onQuestionChange: (updatedQuestion: ClientQuestion) => void;
  competencyName: string;
  questionIndex: number;
  isLoading?: boolean;
}

const DifficultyBadge: React.FC<{ difficulty: ClientQuestion['difficulty'] }> = ({ difficulty }) => {
  let badgeClass = "bg-muted text-muted-foreground"; // Default/fallback
  let icon: React.ReactNode = <HelpCircle className="h-3 w-3 mr-1" />;
  
  switch (difficulty) {
    case 'Naive': badgeClass = "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-300/50"; icon = <ThermometerSnowflake className="h-3 w-3 mr-1" />; break;
    case 'Beginner': badgeClass = "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border border-green-300/50"; icon = <Thermometer className="h-3 w-3 mr-1" />; break;
    case 'Intermediate': badgeClass = "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 border border-yellow-300/50"; icon = <Activity className="h-3 w-3 mr-1" />; break;
    case 'Expert': badgeClass = "bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 border border-orange-300/50"; icon = <Sparkles className="h-3 w-3 mr-1" />; break;
    case 'Master': badgeClass = "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-300/50"; icon = <Gem className="h-3 w-3 mr-1" />; break;
  }
  return <Badge variant="outline" className={`text-xs px-2 py-1 ${badgeClass} shadow-sm`}>{icon}{difficulty}</Badge>;
};

const CategoryBadge: React.FC<{ category: QuestionCategory }> = ({ category }) => {
  const isTechnical = category === 'Technical';
  // Use primary for technical, accent for non-technical
  const badgeClass = isTechnical ? "bg-primary/10 text-primary border-primary/30" : "bg-accent/10 text-accent border-accent/30"; 
  const iconColor = isTechnical ? "text-primary" : "text-accent";
  return (
    <Badge variant="outline" className={`text-xs px-2 py-1 flex items-center ${badgeClass} shadow-sm`}>
      <Tag className={`h-3 w-3 mr-1 ${iconColor}`} />
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
  
  const calculatedScore = useMemo(() => {
    return question.modelAnswerPoints.reduce((total, point) => {
      return point.isChecked ? total + point.points : total;
    }, 0);
  }, [question.modelAnswerPoints]);

  const totalPossiblePoints = useMemo(() => {
    return question.modelAnswerPoints.reduce((total, point) => total + point.points, 0);
  }, [question.modelAnswerPoints]);


  useEffect(() => {
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

  const handlePointCheckedChange = (pointId: string, isChecked: boolean) => {
    const updatedPoints = question.modelAnswerPoints.map(p => 
        p.id === pointId ? { ...p, isChecked } : p
    );
    onQuestionChange({ ...question, modelAnswerPoints: updatedPoints });
  };


  const uniqueIdPrefix = `competency-${competencyName.replace(/\s+/g, '-').toLowerCase()}-q${questionIndex}`;
  const difficultyLevels: QuestionDifficulty[] = ['Naive', 'Beginner', 'Intermediate', 'Expert', 'Master'];
  const categoryLevels: QuestionCategory[] = ['Technical', 'Non-Technical'];

  return (
    <Card className="shadow-lg bg-card border border-border/60 rounded-xl overflow-hidden transition-all hover:shadow-xl">
      <CardHeader className="pb-4 pt-4 px-5 bg-muted/20 border-b border-border/50">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                    {questionIndex + 1}
                </span>
                <CardTitle className="text-lg font-semibold text-foreground">
                    {question.type} Question
                </CardTitle>
            </div>
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={question.category} />
            <DifficultyBadge difficulty={question.difficulty} />
            <Badge variant="outline" className="text-xs px-2 py-1 flex items-center shadow-sm border-muted-foreground/30 text-muted-foreground">
              <Clock3 className="h-3 w-3 mr-1.5" />
              {question.estimatedTimeMinutes} min
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor={`${uniqueIdPrefix}-text`} className="font-semibold text-md flex items-center text-foreground">
            <MessageCircle size={16} className="mr-2 text-primary"/> Question Text
          </Label>
          <Textarea
            id={`${uniqueIdPrefix}-text`}
            value={question.text}
            onChange={(e) => handleInputChange('text', e.target.value)}
            placeholder="Enter question text"
            className="mt-1 text-sm p-3 rounded-lg shadow-inner bg-input/80 focus:bg-background"
            rows={3}
            disabled={isLoading}
            aria-label={`Question text for question ${questionIndex + 1} of competency ${competencyName}`}
          />
        </div>
        
        <div className="space-y-3">
            <Label className="font-semibold text-md flex items-center text-foreground">
                <ListChecks size={16} className="mr-2 text-primary"/> Model Answer Checklist
            </Label>
            <div className="mt-1 p-4 rounded-lg bg-input/50 shadow-inner border border-border/50 space-y-3">
                {question.modelAnswerPoints.map((point) => {
                    if(point.text.startsWith('Note for Interviewer:')) {
                        return (
                            <div key={point.id} className="flex items-start gap-3 p-2 text-xs text-muted-foreground bg-background rounded-md border border-dashed">
                                <Info size={16} className="flex-shrink-0 mt-0.5 text-accent"/>
                                <span>{point.text}</span>
                            </div>
                        )
                    }
                    return (
                        <div key={point.id} className="flex items-start space-x-3">
                            <Checkbox
                                id={`${uniqueIdPrefix}-point-${point.id}`}
                                checked={point.isChecked}
                                onCheckedChange={(checked) => handlePointCheckedChange(point.id, !!checked)}
                                disabled={isLoading}
                                className="mt-1"
                                aria-label={`Checkbox for model answer point: ${point.text}`}
                            />
                            <div className="grid gap-1.5 leading-none">
                                <label
                                htmlFor={`${uniqueIdPrefix}-point-${point.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                {point.text}
                                </label>
                                <p className="text-xs text-muted-foreground">({point.points} {point.points === 1 ? 'point' : 'points'})</p>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-4 items-end pt-2">
           <div className="space-y-1.5">
            <Label htmlFor={`${uniqueIdPrefix}-category`} className="font-medium text-sm flex items-center text-foreground">
              <Tag size={14} className="mr-1.5 text-muted-foreground"/>Category
            </Label>
             <Select
                value={question.category}
                onValueChange={(value: QuestionCategory) => handleCategoryChange(value)}
                disabled={isLoading}
              >
                <SelectTrigger id={`${uniqueIdPrefix}-category`} className="mt-1 shadow-sm bg-input/80 focus:bg-background rounded-lg" aria-label={`Category for question ${questionIndex + 1}`}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryLevels.map(level => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${uniqueIdPrefix}-difficulty`} className="font-medium text-sm flex items-center text-foreground">
               <Sparkles size={14} className="mr-1.5 text-muted-foreground"/>Difficulty
            </Label>
            <Select
                value={question.difficulty}
                onValueChange={(value: QuestionDifficulty) => handleDifficultyChange(value)}
                disabled={isLoading}
              >
                <SelectTrigger id={`${uniqueIdPrefix}-difficulty`} className="mt-1 shadow-sm bg-input/80 focus:bg-background rounded-lg" aria-label={`Difficulty for question ${questionIndex + 1}`}>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  {difficultyLevels.map(level => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${uniqueIdPrefix}-time`} className="font-medium text-sm flex items-center text-foreground">
              <Clock3 size={14} className="mr-1.5 text-muted-foreground"/>Est. Time (min)
            </Label>
            <Input
              id={`${uniqueIdPrefix}-time`}
              type="number"
              value={question.estimatedTimeMinutes}
              onChange={(e) => handleTimeChange(e.target.value)}
              min={0}
              className="mt-1 text-sm p-2 shadow-sm bg-input/80 focus:bg-background rounded-lg"
              disabled={isLoading}
              aria-label={`Estimated time for question ${questionIndex + 1}`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4 pt-3">
          <div className="space-y-1.5">
            <Label className="font-medium text-sm flex items-center text-foreground">
              <Star size={14} className="mr-1.5 text-muted-foreground"/>Question Score
            </Label>
            <div className="flex items-center space-x-3 mt-1 h-10 px-3 py-2 text-lg font-bold rounded-md bg-input/80 shadow-inner">
                <span>{calculatedScore} / {totalPossiblePoints}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${uniqueIdPrefix}-notes`} className="font-medium text-sm flex items-center text-foreground">
              <Edit3 size={14} className="mr-1.5 text-muted-foreground"/>Panelist Notes
            </Label>
            <Textarea
              id={`${uniqueIdPrefix}-notes`}
              value={question.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Your notes during the interview..."
              className="mt-1 text-sm p-3 rounded-lg shadow-inner bg-input/80 focus:bg-background"
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
