
"use client";

import React from 'react';
import type { ClientCompetency, ClientQuestion } from '@/types/interview-kit';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { QuestionEditorCard } from './QuestionEditorCard';
import { Brain, Lightbulb, Zap, Target, Settings, Briefcase, Star, ShieldAlert, ShieldCheck, Shield, Code2, MessageSquare } from 'lucide-react'; 

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
      variant = "destructive"; 
      text = "High Importance";
      break;
    case 'Medium':
      icon = <ShieldCheck className="mr-1 h-3 w-3" />;
      variant = "default"; 
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
    originalQuestionIndex: number // This needs to be the index in the original competency.questions array
  ) => {
    const updatedCompetency = { ...competencies[competencyIndex] };
    // Find the actual question by ID to update it, as its index in filtered arrays might differ
    const actualQuestionIndexInCompetency = updatedCompetency.questions.findIndex(q => q.id === updatedQuestion.id);
    if (actualQuestionIndexInCompetency !== -1) {
      updatedCompetency.questions[actualQuestionIndexInCompetency] = updatedQuestion;
      onCompetencyChange(updatedCompetency, competencyIndex);
    }
  };
  

  if (!competencies || competencies.length === 0) {
    return <p className="text-muted-foreground text-center py-4">No competencies to display.</p>;
  }
  
  return (
    <Accordion type="multiple" defaultValue={competencies.map(c => c.id)} className="w-full space-y-3">
      {competencies.map((competency, compIndex) => {
        const technicalQuestions = competency.questions.filter(q => q.category === 'Technical');
        const nonTechnicalQuestions = competency.questions.filter(q => q.category === 'Non-Technical');
        
        // Find original index for mapping
        const findOriginalIndex = (questionId: string) => competency.questions.findIndex(q => q.id === questionId);

        return (
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
            <AccordionContent className="p-4 pt-2 bg-background/30 space-y-6">
              {technicalQuestions.length > 0 && (
                <div>
                  <h3 className="text-md font-semibold mb-3 flex items-center text-primary">
                    <Code2 className="mr-2 h-5 w-5" /> Technical Questions
                  </h3>
                  {technicalQuestions.map((question) => (
                    <QuestionEditorCard
                      key={question.id}
                      question={question}
                      onQuestionChange={(updatedQuestion) =>
                        handleQuestionChange(updatedQuestion, compIndex, findOriginalIndex(question.id))
                      }
                      competencyName={competency.name}
                      questionIndex={findOriginalIndex(question.id)}
                      isLoading={isLoading}
                    />
                  ))}
                </div>
              )}

              {nonTechnicalQuestions.length > 0 && (
                <div>
                  <h3 className="text-md font-semibold mb-3 flex items-center text-accent">
                    <MessageSquare className="mr-2 h-5 w-5" /> Non-Technical Questions
                  </h3>
                  {nonTechnicalQuestions.map((question) => (
                    <QuestionEditorCard
                      key={question.id}
                      question={question}
                      onQuestionChange={(updatedQuestion) =>
                        handleQuestionChange(updatedQuestion, compIndex, findOriginalIndex(question.id))
                      }
                      competencyName={competency.name}
                      questionIndex={findOriginalIndex(question.id)}
                      isLoading={isLoading}
                    />
                  ))}
                </div>
              )}
              
              {competency.questions.length === 0 && (
                <p className="text-muted-foreground text-sm py-2">No questions for this competency.</p>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
