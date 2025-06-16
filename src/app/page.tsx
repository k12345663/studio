
"use client";

import { useState, useCallback } from 'react';
import { generateInterviewKit, type GenerateInterviewKitInput, type GenerateInterviewKitOutput } from '@/ai/flows/generate-interview-kit';
import { customizeInterviewKit, type CustomizeInterviewKitInput, type CustomizeInterviewKitOutput } from '@/ai/flows/customize-interview-kit';
import type { InterviewKit, ClientCompetency, ClientQuestion, ClientRubricCriterion } from '@/types/interview-kit';
import { generateId } from '@/types/interview-kit';

import { AppHeader } from '@/components/layout/AppHeader';
import { JobDescriptionForm } from '@/components/interview-kit/JobDescriptionForm';
import { InterviewKitDisplay } from '@/components/interview-kit/InterviewKitDisplay';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  const [jobDescriptionText, setJobDescriptionText] = useState<string>('');
  const [interviewKit, setInterviewKit] = useState<InterviewKit | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const mapOutputToClientKit = useCallback((output: GenerateInterviewKitOutput, jdToStore: string): InterviewKit => {
    return {
      jobDescription: jdToStore,
      competencies: output.competencies.map(comp => ({
        id: generateId('comp'),
        name: comp.name,
        importance: comp.importance || 'Medium',
        questions: comp.questions.map(q => ({
          id: generateId('q'),
          type: q.type,
          text: q.question,
          modelAnswer: q.answer,
          difficulty: q.difficulty || 'Medium',
          estimatedTimeMinutes: q.estimatedTimeMinutes || 5,
          score: 3, 
          notes: '',
        })),
      })),
      scoringRubric: output.scoringRubric.map(rubric => ({
        id: generateId('rubric'),
        name: rubric.criterion,
        weight: rubric.weight,
      })),
    };
  }, []);
  
  const mapClientKitToCustomizeInput = useCallback((clientKit: InterviewKit): CustomizeInterviewKitInput => {
    return {
      jobDescription: clientKit.jobDescription,
      competencies: clientKit.competencies.map(comp => ({
        id: comp.id, 
        name: comp.name,
        importance: comp.importance,
        questions: comp.questions.map(q => ({
          id: q.id, 
          type: q.type,
          text: q.text,
          modelAnswer: q.modelAnswer,
          difficulty: q.difficulty,
          estimatedTimeMinutes: q.estimatedTimeMinutes,
        })),
      })),
      rubricCriteria: clientKit.scoringRubric.map(rubric => ({
        name: rubric.name,
        weight: rubric.weight,
      })),
    };
  }, []);

  const mapCustomizeOutputToClientKit = useCallback((output: CustomizeInterviewKitOutput, existingKit: InterviewKit): InterviewKit => {
    const newCompetencies = output.competencies.map(newComp => {
      const existingComp = existingKit.competencies.find(ec => ec.id === newComp.id);
      return {
        id: newComp.id, 
        name: newComp.name,
        importance: newComp.importance || existingComp?.importance || 'Medium',
        questions: newComp.questions.map(newQ => {
          const existingQ = existingComp?.questions.find(eq => eq.id === newQ.id); 
          return {
            id: newQ.id,
            type: newQ.type,
            text: newQ.text,
            modelAnswer: newQ.modelAnswer,
            difficulty: newQ.difficulty || existingQ?.difficulty || 'Medium',
            estimatedTimeMinutes: newQ.estimatedTimeMinutes || existingQ?.estimatedTimeMinutes || 5,
            score: existingQ?.score ?? 3,
            notes: existingQ?.notes ?? '',
          };
        }),
      };
    });

    const newRubric = output.rubricCriteria.map((newCrit) => {
      const existingCritByName = existingKit.scoringRubric.find(er => er.name === newCrit.name);
      return {
        id: existingCritByName?.id || generateId('rubric'),
        name: newCrit.name,
        weight: newCrit.weight,
      };
    });
    
    return {
      jobDescription: existingKit.jobDescription,
      competencies: newCompetencies,
      scoringRubric: newRubric,
    };
  }, []);


  const handleGenerateKit = useCallback(async (jdText: string) => {
    setIsLoading(true);
    setInterviewKit(null); 
    setJobDescriptionText(jdText);

    try {
      if (!jdText.trim()) {
        throw new Error("Job description is empty.");
      }

      const input: GenerateInterviewKitInput = { jobDescription: jdText };
      const output = await generateInterviewKit(input);
      if (output && output.competencies && output.scoringRubric) {
        setInterviewKit(mapOutputToClientKit(output, jdText));
        toast({ title: "Success!", description: "Interview kit generated." });
      } else {
        throw new Error("AI response was empty or malformed.");
      }
    } catch (error) {
      console.error("Error generating interview kit:", error);
      toast({ variant: "destructive", title: "Error", description: `Failed to generate kit: ${error instanceof Error ? error.message : String(error)}` });
      setInterviewKit(null);
      // setJobDescriptionText(''); Keep the JD text for user reference
    } finally {
      setIsLoading(false);
    }
  }, [mapOutputToClientKit, toast]);

  const handleCustomizeKit = useCallback(async () => {
    if (!interviewKit) return;
    setIsLoading(true);
    try {
      const input = mapClientKitToCustomizeInput(interviewKit);
      const output = await customizeInterviewKit(input);
       if (output && output.competencies && output.rubricCriteria) {
        setInterviewKit(mapCustomizeOutputToClientKit(output, interviewKit));
        toast({ title: "Success!", description: "Interview kit updated." });
      } else {
        throw new Error("AI customization response was empty or malformed.");
      }
    } catch (error) {
      console.error("Error customizing interview kit:", error);
      toast({ variant: "destructive", title: "Error", description: `Failed to update kit: ${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setIsLoading(false);
    }
  }, [interviewKit, mapClientKitToCustomizeInput, mapCustomizeOutputToClientKit, toast]);

  const handleKitChange = useCallback((updatedKit: InterviewKit) => {
    setInterviewKit(updatedKit);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <JobDescriptionForm onSubmit={handleGenerateKit} isLoading={isLoading && !interviewKit} />

          {isLoading && !interviewKit && (
            <div className="flex justify-center">
              <LoadingIndicator text="Generating your interview kit, please wait..." />
            </div>
          )}
          
          {!isLoading && !interviewKit && jobDescriptionText && (
            <Card>
              <CardHeader>
                <CardTitle>Processed Job Description</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap text-sm text-muted-foreground max-h-60 overflow-y-auto p-4 border rounded-md bg-muted/50">
                  {jobDescriptionText}
                </pre>
              </CardContent>
            </Card>
          )}

          {!isLoading && !interviewKit && !jobDescriptionText && (
             <Card className="text-center bg-card shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl sm:text-3xl font-headline text-primary">Welcome to RecruTake</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                  Streamline your hiring with RecruTake. Paste a job description to instantly generate relevant questions, model answers, and a consistent scoring rubric. Now with added insights on competency importance, question difficulty, and estimated answering times.
                </CardDescription>
              </CardContent>
            </Card>
          )}

          {interviewKit && (
            <InterviewKitDisplay
              kit={interviewKit}
              onKitChange={handleKitChange}
              onCustomizeKit={handleCustomizeKit}
              isLoading={isLoading}
            />
          )}
        </div>
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border mt-auto">
        © {new Date().getFullYear()} RecruTake by Unstop. All rights reserved.
      </footer>
    </div>
  );
}
