
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
import { Wrench, Puzzle, Users, HelpCircle, ThermometerSnowflake, Thermometer, Activity, Sparkles, Gem, Clock3, Tag, Type, MessageCircle, Star, Edit3 } from 'lucide-react';
import type React from 'react'; 
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
      return <Wrench className="h-4 w-4 mr-2 text-blue-500" aria-label="Technical Question" />;
    case 'Scenario':
      return <Puzzle className="h-4 w-4 mr-2 text-purple-500" aria-label="Scenario Question" />;
    case 'Behavioral':
      return <Users className="h-4 w-4 mr-2 text-green-500" aria-label="Behavioral Question" />;
    default:
      return <HelpCircle className="h-4 w-4 mr-2 text-gray-500" aria-label="Generic Question" />;
  }
};

const DifficultyBadge: React.FC<{ difficulty: ClientQuestion['difficulty'] }> = ({ difficulty }) => {
  let badgeClass = "bg-gray-100 text-gray-700";
  let icon: React.ReactNode = <HelpCircle className="h-3 w-3 mr-1" />;
  
  switch (difficulty) {
    case 'Naive': badgeClass = "bg-blue-100 text-blue-700"; icon = <ThermometerSnowflake className="h-3 w-3 mr-1" />; break;
    case 'Beginner': badgeClass = "bg-green-100 text-green-700"; icon = <Thermometer className="h-3 w-3 mr-1" />; break;
    case 'Intermediate': badgeClass = "bg-yellow-100 text-yellow-700"; icon = <Activity className="h-3 w-3 mr-1" />; break;
    case 'Expert': badgeClass = "bg-orange-100 text-orange-700"; icon = <Sparkles className="h-3 w-3 mr-1" />; break;
    case 'Master': badgeClass = "bg-red-100 text-red-700"; icon = <Gem className="h-3 w-3 mr-1" />; break;
  }
  return <Badge className={`text-xs px-2 py-1 ${badgeClass} shadow-sm`}>{icon}{difficulty}</Badge>;
};

const CategoryBadge: React.FC<{ category: QuestionCategory }> = ({ category }) => {
  const isTechnical = category === 'Technical';
  const badgeClass = isTechnical ? "bg-indigo-100 text-indigo-700" : "bg-pink-100 text-pink-700";
  return (
    <Badge className={`text-xs px-2 py-1 flex items-center ${badgeClass} shadow-sm`}>
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
    <Card className="shadow-lg bg-card border border-border/60 rounded-lg overflow-hidden transition-all hover:shadow-xl">
      <CardHeader className="pb-4 pt-4 px-5 bg-muted/20 border-b border-border/50">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <CardTitle className="text-lg font-semibold flex items-center text-foreground">
            {getQuestionTypeIcon(question.type)}
            Question {questionIndex + 1} 
            <Badge variant="outline" className="ml-3 text-xs">{question.type}</Badge>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={question.category} />
            <DifficultyBadge difficulty={question.difficulty} />
            <Badge variant="outline" className="text-xs px-2 py-1 flex items-center shadow-sm">
              <Clock3 className="h-3 w-3 mr-1.5 text-muted-foreground" />
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
            className="mt-1 text-sm p-3 rounded-md shadow-inner bg-background/70"
            rows={3}
            disabled={isLoading}
            aria-label={`Question text for question ${questionIndex + 1} of competency ${competencyName}`}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${uniqueIdPrefix}-modelAnswer`} className="font-semibold text-md flex items-center text-foreground">
             <Type size={16} className="mr-2 text-primary"/> Model Answer (3-4 bullet points)
          </Label>
          <Textarea
            id={`${uniqueIdPrefix}-modelAnswer`}
            value={question.modelAnswer}
            onChange={(e) => handleInputChange('modelAnswer', e.target.value)}
            placeholder="Enter model answer as 3-4 concise bullet points, referencing JD/resume/context..."
            className="mt-1 text-sm p-3 rounded-md shadow-inner bg-background/70"
            rows={4}
            disabled={isLoading}
            aria-label={`Model answer for question ${questionIndex + 1}`}
          />
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
                <SelectTrigger id={`${uniqueIdPrefix}-category`} className="mt-1 shadow-sm bg-background/70" aria-label={`Category for question ${questionIndex + 1}`}>
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
                <SelectTrigger id={`${uniqueIdPrefix}-difficulty`} className="mt-1 shadow-sm bg-background/70" aria-label={`Difficulty for question ${questionIndex + 1}`}>
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
              className="mt-1 text-sm p-2 shadow-sm bg-background/70"
              disabled={isLoading}
              aria-label={`Estimated time for question ${questionIndex + 1}`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4 pt-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${uniqueIdPrefix}-score`} className="font-medium text-sm flex items-center text-foreground">
              <Star size={14} className="mr-1.5 text-muted-foreground"/>Panelist Score (1-10)
            </Label>
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
                      handleInputChange('score', 1); 
                    } else if (!isNaN(val) && val >= 1 && val <=10) {
                      handleInputChange('score', val);
                    } else if (!isNaN(val) && val < 1) {
                      handleInputChange('score', 1);
                    } else if (!isNaN(val) && val > 10) {
                      handleInputChange('score', 10);
                    }
                }}
                min={1} max={10}
                className="w-20 text-center shadow-sm bg-background/70"
                disabled={isLoading}
                aria-label={`Score input field for question ${questionIndex + 1}`}
              />
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
              className="mt-1 text-sm p-3 rounded-md shadow-inner bg-background/70"
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
