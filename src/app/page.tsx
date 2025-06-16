
"use client";

import { useState, useCallback } from 'react';
import { generateInterviewKit, type GenerateInterviewKitInput, type GenerateInterviewKitOutput } from '@/ai/flows/generate-interview-kit';
import { customizeInterviewKit, type CustomizeInterviewKitInput, type CustomizeInterviewKitOutput } from '@/ai/flows/customize-interview-kit';
import type { InterviewKit, ClientCompetency, ClientQuestion, ClientRubricCriterion, QuestionDifficulty, QuestionCategory } from '@/types/interview-kit';
import { generateId, difficultyTimeMap } from '@/types/interview-kit';

import { AppHeader } from '@/components/layout/AppHeader';
import { JobDescriptionForm, type JobDescriptionFormSubmitData } from '@/components/interview-kit/JobDescriptionForm';
import { InterviewKitDisplay } from '@/components/interview-kit/InterviewKitDisplay';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Briefcase, UserCircle, Zap } from 'lucide-react';

export default function Home() {
  const [jobDescription, setJobDescription] = useState<string>('');
  const [candidateExperienceContext, setCandidateExperienceContext] = useState<string | undefined>(undefined);
  const [candidateResume, setCandidateResume] = useState<string | undefined>(undefined);
  const [interviewKit, setInterviewKit] = useState<InterviewKit | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const mapOutputToClientKit = useCallback((output: GenerateInterviewKitOutput, jdToStore: string, resumeToStore?: string, expContext?: string): InterviewKit => {
    return {
      jobDescription: jdToStore,
      candidateExperienceContext: expContext,
      candidateResume: resumeToStore,
      competencies: output.competencies.map(comp => ({
        id: generateId('comp'),
        name: comp.name,
        importance: comp.importance || 'Medium',
        questions: comp.questions.map(q => ({
          id: generateId('q'),
          type: q.type,
          category: q.category || (q.type === 'Technical' ? 'Technical' : 'Non-Technical') as QuestionCategory,
          text: q.question,
          modelAnswer: q.answer,
          difficulty: q.difficulty || 'Intermediate',
          estimatedTimeMinutes: q.estimatedTimeMinutes || difficultyTimeMap[q.difficulty || 'Intermediate'],
          score: 5, // Default score for 1-10 scale
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
      candidateExperienceContext: clientKit.candidateExperienceContext,
      candidateResume: clientKit.candidateResume,
      competencies: clientKit.competencies.map(comp => ({
        id: comp.id,
        name: comp.name,
        importance: comp.importance,
        questions: comp.questions.map(q => ({
          id: q.id,
          type: q.type,
          category: q.category,
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
            category: newQ.category || existingQ?.category || (newQ.type === 'Technical' ? 'Technical' : 'Non-Technical') as QuestionCategory,
            text: newQ.text,
            modelAnswer: newQ.modelAnswer,
            difficulty: newQ.difficulty || existingQ?.difficulty || 'Intermediate',
            estimatedTimeMinutes: newQ.estimatedTimeMinutes || existingQ?.estimatedTimeMinutes || difficultyTimeMap[newQ.difficulty || existingQ?.difficulty || 'Intermediate'],
            score: existingQ?.score ?? 5, // Default score 5 for 1-10 scale
            notes: existingQ?.notes ?? '',
          };
        }),
      };
    });

    const newRubric = output.rubricCriteria.map((newCrit) => {
      let existingCrit = existingKit.scoringRubric.find(er => er.name === newCrit.name); // Try to match by name
      return {
        id: existingCrit?.id || generateId('rubric'),
        name: newCrit.name,
        weight: newCrit.weight,
      };
    });

    return {
      jobDescription: existingKit.jobDescription,
      candidateExperienceContext: existingKit.candidateExperienceContext,
      candidateResume: existingKit.candidateResume, // Preserve candidate resume
      competencies: newCompetencies,
      scoringRubric: newRubric,
    };
  }, []);


  const handleGenerateKit = useCallback(async (data: JobDescriptionFormSubmitData) => {
    setIsLoading(true);
    setInterviewKit(null);
    setJobDescription(data.jobDescription);
    setCandidateExperienceContext(data.candidateExperienceContext);
    setCandidateResume(data.candidateResume);


    try {
      if (!data.jobDescription.trim()) {
        throw new Error("Job description is empty.");
      }

      const input: GenerateInterviewKitInput = {
        jobDescription: data.jobDescription,
        candidateExperienceContext: data.candidateExperienceContext,
        candidateResume: data.candidateResume,
      };
      const output = await generateInterviewKit(input);
      if (output && output.competencies && output.scoringRubric) {
        setInterviewKit(mapOutputToClientKit(output, data.jobDescription, data.candidateResume, data.candidateExperienceContext));
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
    <div className="flex flex-col min-h-screen bg-muted/30 dark:bg-muted/10">
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <JobDescriptionForm onSubmit={handleGenerateKit} isLoading={isLoading && !interviewKit} />

          {isLoading && !interviewKit && (
            <div className="flex justify-center py-10">
              <LoadingIndicator text="Generating your interview kit, please wait..." />
            </div>
          )}

          {!isLoading && !interviewKit && jobDescription && (
             <Card className="mt-8 shadow-lg transition-shadow hover:shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center text-xl font-semibold">
                  <Briefcase className="mr-2 h-5 w-5 text-primary" />
                  Processed Inputs
                </CardTitle>
                <CardDescription>Review the information used to generate the kit.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 text-sm">
                <div>
                  <h3 className="font-semibold mb-1 text-foreground flex items-center">
                     <FileText size={16} className="mr-2 text-muted-foreground"/> Job Description:
                  </h3>
                  <pre className="whitespace-pre-wrap text-muted-foreground max-h-48 overflow-y-auto p-3 border rounded-md bg-background shadow-inner custom-scrollbar">
                    {jobDescription}
                  </pre>
                </div>
                {candidateResume && (
                  <div>
                    <h3 className="font-semibold mb-1 text-foreground flex items-center">
                      <UserCircle size={16} className="mr-2 text-muted-foreground"/> Candidate Resume:
                    </h3>
                    <pre className="whitespace-pre-wrap text-muted-foreground max-h-48 overflow-y-auto p-3 border rounded-md bg-background shadow-inner custom-scrollbar">
                      {candidateResume}
                    </pre>
                  </div>
                )}
                {candidateExperienceContext && (
                  <div>
                    <h3 className="font-semibold mb-1 text-foreground flex items-center">
                      <FileText size={16} className="mr-2 text-muted-foreground"/> Additional Context:
                    </h3>
                    <pre className="whitespace-pre-wrap text-muted-foreground max-h-40 overflow-y-auto p-3 border rounded-md bg-background shadow-inner custom-scrollbar">
                      {candidateExperienceContext}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!isLoading && !interviewKit && !jobDescription && (
             <Card className="text-center bg-card shadow-xl border border-primary/20 transition-shadow hover:shadow-2xl">
              <CardHeader className="pt-8">
                <CardTitle className="text-2xl sm:text-3xl font-headline text-primary flex items-center justify-center">
                 <Zap className="mr-3 h-8 w-8 text-primary/90" /> Welcome to RecruTake
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-8 pt-2">
                <CardDescription className="text-base text-muted-foreground max-w-xl mx-auto mb-6">
                 Paste a job description, candidate's resume (optional), and any additional candidate context. RecruTake will instantly generate relevant questions, model answers, difficulty ratings, timings, categories, and a consistent scoring rubric tailored for your interview.
                </CardDescription>
                {/* Image removed as requested */}
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
      <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border bg-card">
        © {new Date().getFullYear()} RecruTake by Unstop. All rights reserved.
      </footer>
    </div>
  );
}
