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
import Image from 'next/image';

export default function Home() {
  const [jobDescription, setJobDescription] = useState<string>('');
  const [interviewKit, setInterviewKit] = useState<InterviewKit | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const mapOutputToClientKit = useCallback((output: GenerateInterviewKitOutput, jd: string): InterviewKit => {
    return {
      jobDescription: jd,
      competencies: output.competencies.map(comp => ({
        id: generateId('comp'),
        name: comp.name,
        questions: comp.questions.map(q => ({
          id: generateId('q'),
          type: q.type,
          text: q.question,
          modelAnswer: q.answer,
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
        questions: comp.questions.map(q => ({
          id: q.id, 
          type: q.type,
          text: q.text,
          modelAnswer: q.modelAnswer,
        })),
      })),
      rubricCriteria: clientKit.scoringRubric.map(rubric => ({
        // id field is not in CustomizeInterviewKitInput.RubricCriterionSchema from the AI flow
        // but it's fine to have it on the client, we just don't send it if not needed or API handles extra fields.
        // For matching, the `name` is likely the key for rubric items if AI doesn't use ID.
        // The AI flow for customize takes rubricCriteria: [{name, weight}]. So ID from client is not used by AI for rubric.
        name: rubric.name,
        weight: rubric.weight,
      })),
    };
  }, []);

  const mapCustomizeOutputToClientKit = useCallback((output: CustomizeInterviewKitOutput, existingKit: InterviewKit): InterviewKit => {
    const newCompetencies = output.competencies.map(newComp => {
      const existingComp = existingKit.competencies.find(ec => ec.id === newComp.id);
      return {
        id: newComp.id, // API returns ID for competency
        name: newComp.name,
        questions: newComp.questions.map(newQ => {
          const existingQ = existingComp?.questions.find(eq => eq.id === newQ.id); // API returns ID for question
          return {
            id: newQ.id,
            type: newQ.type,
            text: newQ.text,
            modelAnswer: newQ.modelAnswer,
            score: existingQ?.score ?? 3,
            notes: existingQ?.notes ?? '',
          };
        }),
      };
    });

    const newRubric = output.rubricCriteria.map((newCrit, index) => {
      // AI returns [{name, weight}]. We need to map to ClientRubricCriterion which has an ID.
      // Try to match by name, or use existing ID by index if names changed. Fallback to new ID.
      const existingCritByName = existingKit.scoringRubric.find(er => er.name === newCrit.name);
      const existingCritByIndex = existingKit.scoringRubric[index];
      let idToUse = generateId('rubric');
      if (existingCritByName) {
        idToUse = existingCritByName.id;
      } else if (existingCritByIndex) {
        idToUse = existingCritByIndex.id;
      }
      
      return {
        id: idToUse,
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


  const handleGenerateKit = useCallback(async (jd: string) => {
    setIsLoading(true);
    setJobDescription(jd);
    setInterviewKit(null); 
    try {
      const input: GenerateInterviewKitInput = { jobDescription: jd };
      const output = await generateInterviewKit(input);
      if (output && output.competencies && output.scoringRubric) {
        setInterviewKit(mapOutputToClientKit(output, jd));
        toast({ title: "Success!", description: "Interview kit generated." });
      } else {
        throw new Error("AI response was empty or malformed.");
      }
    } catch (error) {
      console.error("Error generating interview kit:", error);
      toast({ variant: "destructive", title: "Error", description: `Failed to generate kit: ${error instanceof Error ? error.message : String(error)}` });
      setInterviewKit(null);
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
        <div className="max-w-4xl mx-auto">
          <JobDescriptionForm onSubmit={handleGenerateKit} isLoading={isLoading && !interviewKit} />

          {isLoading && !interviewKit && (
            <div className="mt-8 flex justify-center">
              <LoadingIndicator text="Generating your interview kit, please wait..." />
            </div>
          )}

          {!isLoading && !interviewKit && (
             <Card className="mt-8 text-center p-6 sm:p-8 bg-card shadow-lg">
              <CardHeader className="p-0 sm:p-2">
                <Image 
                  src="https://placehold.co/600x400.png" 
                  alt="Team discussing interview questions" 
                  width={300} 
                  height={200} 
                  className="mx-auto rounded-lg mb-6 shadow-md" 
                  data-ai-hint="team collaboration"
                  priority
                />
                <CardTitle className="text-2xl sm:text-3xl font-headline text-primary">Welcome to InterviewAI</CardTitle>
              </CardHeader>
              <CardContent className="p-0 sm:p-2 mt-4">
                <CardDescription className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                  Streamline your hiring process. Paste a job description to instantly generate relevant questions, model answers, and a consistent scoring rubric. Save time and conduct better interviews.
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
        © {new Date().getFullYear()} InterviewAI. All rights reserved.
      </footer>
    </div>
  );
}
