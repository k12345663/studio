
"use client";

import React from 'react'; // Added this line
import type { ClientCompetency, ClientQuestion } from '@/types/interview-kit';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { QuestionEditorCard } from './QuestionEditorCard';
import { Brain, Lightbulb, Zap, Target, Settings, Briefcase, Star, ShieldAlert, ShieldCheck, Shield } from 'lucide-react'; 

interface CompetencyAccordionProps {
  competencies: ClientCompetency[];
  onCompetencyChange: (updatedCompetency: ClientCompetency, competencyIndex: number) => void;
  isLoading?: boolean;
}

const competencyIcons = [
  <Brain key="brain" className="mr-2 h-5 w-5 text-primary" />,
  <Lightbulb key="lightbulb" className="mr-2 h-5 w-5 text-primary" />,
  <Zap key="zap" className="mr-2 h-5 w-5 text-primary" />,
  <Target key="target" className="mr-2 h-5 w-5 text-primary" />,
  <Settings key="settings" className="mr-2 h-5 w-5 text-primary" />,
  <Briefcase key="briefcase" className="mr-2 h-5 w-5 text-primary" />,
];

const ImportanceIndicator: React.FC<{ importance: ClientCompetency['importance'] }> = ({ importance }) => {
  let icon = <Star className="mr-1 h-3 w-3" />;
  let variant: "default" | "secondary" | "destructive" | "outline" = "default";
  let text = importance;

  switch (importance) {
    case 'High':
      icon = <ShieldAlert className="mr-1 h-3 w-3" />;
      variant = "destructive"; // Or a prominent color like primary
      text = "High Importance";
      break;
    case 'Medium':
      icon = <ShieldCheck className="mr-1 h-3 w-3" />;
      variant = "default"; // Primary color
      text = "Medium Importance";
      break;
    case 'Low':
      icon = <Shield className="mr-1 h-3 w-3" />;
      variant = "secondary";
      text = "Low Importance";
      break;
  }

  return (
    <Badge variant={variant} className="ml-3 text-xs px-2 py-0.5">
      {icon}
      {text}
    </Badge>
  );
};


export function CompetencyAccordion({ competencies, onCompetencyChange, isLoading = false }: CompetencyAccordionProps) {
  const handleQuestionChange = (
    updatedQuestion: ClientQuestion,
    competencyIndex: number,
    questionIndex: number
  ) => {
    const updatedCompetency = { ...competencies[competencyIndex] };
    updatedCompetency.questions[questionIndex] = updatedQuestion;
    onCompetencyChange(updatedCompetency, competencyIndex);
  };

  if (!competencies || competencies.length === 0) {
    return <p className="text-muted-foreground text-center py-4">No competencies to display.</p>;
  }
  
  return (
    <Accordion type="multiple" defaultValue={competencies.map(c => c.id)} className="w-full space-y-3">
      {competencies.map((competency, compIndex) => (
        <AccordionItem value={competency.id} key={competency.id} className="border border-border rounded-lg shadow-sm bg-card overflow-hidden">
          <AccordionTrigger className="p-4 hover:no-underline text-xl font-headline font-medium data-[state=open]:border-b data-[state=open]:border-border">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                {React.cloneElement(competencyIcons[compIndex % competencyIcons.length], { 'aria-label': `${competency.name} competency icon` })}
                {competency.name}
              </div>
              <ImportanceIndicator importance={competency.importance} />
            </div>
          </AccordionTrigger>
          <AccordionContent className="p-4 pt-2 bg-background/30">
            {competency.questions.map((question, qIndex) => (
              <QuestionEditorCard
                key={question.id}
                question={question}
                onQuestionChange={(updatedQuestion) =>
                  handleQuestionChange(updatedQuestion, compIndex, qIndex)
                }
                competencyName={competency.name}
                questionIndex={qIndex}
                isLoading={isLoading}
              />
            ))}
             {competency.questions.length === 0 && (
              <p className="text-muted-foreground text-sm py-2">No questions for this competency.</p>
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
