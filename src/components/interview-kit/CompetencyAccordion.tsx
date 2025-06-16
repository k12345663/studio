
"use client";

import React from 'react';
import type { ClientCompetency, ClientQuestion } from '@/types/interview-kit';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { QuestionEditorCard } from './QuestionEditorCard';
import { Brain, Lightbulb, Zap, Target, Settings, Briefcase, Star, ShieldAlert, ShieldCheck, Shield, Code2, MessageSquare, ChevronRight } from 'lucide-react'; 

interface CompetencyAccordionProps {
  competencies: ClientCompetency[];
  onCompetencyChange: (updatedCompetency: ClientCompetency, competencyIndex: number) => void;
  isLoading?: boolean;
}

const competencyIcons = [
  <Brain key="brain" className="mr-3 h-6 w-6 text-primary/80" />,
  <Lightbulb key="lightbulb" className="mr-3 h-6 w-6 text-primary/80" />,
  <Zap key="zap" className="mr-3 h-6 w-6 text-primary/80" />,
  <Target key="target" className="mr-3 h-6 w-6 text-primary/80" />,
  <Settings key="settings" className="mr-3 h-6 w-6 text-primary/80" />,
  <Briefcase key="briefcase" className="mr-3 h-6 w-6 text-primary/80" />,
];

const ImportanceIndicator: React.FC<{ importance: ClientCompetency['importance'] }> = ({ importance }) => {
  let icon = <Star className="mr-1.5 h-4 w-4" />;
  let variant: "default" | "secondary" | "destructive" | "outline" = "default";
  let text = importance;
  let textColor = "text-primary-foreground";

  switch (importance) {
    case 'High':
      icon = <ShieldAlert className="mr-1.5 h-4 w-4" />;
      variant = "destructive"; 
      text = "High";
      textColor = "text-destructive-foreground";
      break;
    case 'Medium':
      icon = <ShieldCheck className="mr-1.5 h-4 w-4" />;
      variant = "default"; 
      textColor = "text-primary-foreground";
      text = "Medium";
      break;
    case 'Low':
      icon = <Shield className="mr-1.5 h-4 w-4" />;
      variant = "secondary";
      textColor = "text-secondary-foreground";
      text = "Low";
      break;
  }

  return (
    <Badge variant={variant} className={`ml-3 text-xs px-2.5 py-1 ${textColor} shadow-sm`}>
      {icon}
      {text}
    </Badge>
  );
};


export function CompetencyAccordion({ competencies, onCompetencyChange, isLoading = false }: CompetencyAccordionProps) {
  const handleQuestionChange = (
    updatedQuestion: ClientQuestion,
    competencyIndex: number,
    originalQuestionIndex: number 
  ) => {
    const updatedCompetency = { ...competencies[competencyIndex] };
    const actualQuestionIndexInCompetency = updatedCompetency.questions.findIndex(q => q.id === updatedQuestion.id);
    if (actualQuestionIndexInCompetency !== -1) {
      updatedCompetency.questions[actualQuestionIndexInCompetency] = updatedQuestion;
      onCompetencyChange(updatedCompetency, competencyIndex);
    }
  };
  

  if (!competencies || competencies.length === 0) {
    return <p className="text-muted-foreground text-center py-6 text-lg">No competencies to display.</p>;
  }
  
  return (
    <Accordion type="multiple" defaultValue={competencies.map(c => c.id)} className="w-full space-y-4">
      {competencies.map((competency, compIndex) => {
        const technicalQuestions = competency.questions.filter(q => q.category === 'Technical');
        const nonTechnicalQuestions = competency.questions.filter(q => q.category === 'Non-Technical');
        
        const findOriginalIndex = (questionId: string) => competency.questions.findIndex(q => q.id === questionId);

        return (
          <AccordionItem value={competency.id} key={competency.id} className="border border-border/70 rounded-xl shadow-lg bg-card overflow-hidden transition-shadow hover:shadow-xl">
            <AccordionTrigger className="p-5 hover:no-underline text-xl font-headline font-semibold data-[state=open]:border-b data-[state=open]:border-border/50 data-[state=open]:bg-muted/30 hover:bg-muted/20 transition-colors">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center text-foreground">
                  {React.cloneElement(competencyIcons[compIndex % competencyIcons.length], { 'aria-label': `${competency.name} competency icon` })}
                  {competency.name}
                </div>
                <div className="flex items-center">
                  <ImportanceIndicator importance={competency.importance} />
                  <ChevronRight className="h-5 w-5 ml-3 text-muted-foreground transition-transform duration-200 group-[[data-state=open]]:rotate-90" />
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-5 pt-3 bg-background/50 space-y-6">
              {technicalQuestions.length > 0 && (
                <div className="mt-2">
                  <h3 className="text-lg font-semibold mb-4 flex items-center text-primary border-b pb-2 border-primary/20">
                    <Code2 className="mr-2 h-5 w-5" /> Technical Questions
                  </h3>
                  <div className="space-y-4">
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
                </div>
              )}

              {nonTechnicalQuestions.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center text-accent border-b pb-2 border-accent/20">
                    <MessageSquare className="mr-2 h-5 w-5" /> Non-Technical Questions
                  </h3>
                   <div className="space-y-4">
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
                </div>
              )}
              
              {competency.questions.length === 0 && (
                <p className="text-muted-foreground text-sm py-3 text-center">No questions currently for this competency.</p>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
