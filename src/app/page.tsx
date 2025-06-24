
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Briefcase, LinkIcon, FileCheck, Zap, MessageSquare, Info, AlertTriangle, ClipboardList } from 'lucide-react';

export default function Home() {
  const [jobDescription, setJobDescription] = useState<string>('');
  const [unstopProfileLink, setUnstopProfileLink] = useState<string | undefined>(undefined);
  const [unstopProfileDetails, setUnstopProfileDetails] = useState<string | undefined>(undefined);
  const [candidateResumeDataUri, setCandidateResumeDataUri] = useState<string | undefined | null>(undefined); // null indicates client-side processing error
  const [candidateResumeFileName, setCandidateResumeFileName] = useState<string | undefined>(undefined);
  const [candidateExperienceContext, setCandidateExperienceContext] = useState<string | undefined>(undefined);
  const [interviewKit, setInterviewKit] = useState<InterviewKit | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('Generating your interview kit, please wait...');
  const [showInputs, setShowInputs] = useState<boolean>(false);
  const { toast } = useToast();

  const mapOutputToClientKit = useCallback((output: GenerateInterviewKitOutput, jdToStore: string, unstopLink?: string, unstopDetails?: string, resumeDataUri?: string | null, resumeFileName?: string, expContext?: string): InterviewKit => {
    return {
      jobDescription: jdToStore,
      unstopProfileLink: unstopLink,
      unstopProfileDetails: unstopDetails,
      candidateResumeDataUri: resumeDataUri === null ? undefined : resumeDataUri, // Store as undefined if client processing failed
      candidateResumeFileName: resumeFileName,
      candidateExperienceContext: expContext,
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
          score: 5,
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
      unstopProfileLink: clientKit.unstopProfileLink,
      unstopProfileDetails: clientKit.unstopProfileDetails,
      candidateResumeDataUri: clientKit.candidateResumeDataUri,
      candidateResumeFileName: clientKit.candidateResumeFileName,
      candidateExperienceContext: clientKit.candidateExperienceContext,
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
            score: existingQ?.score ?? 5,
            notes: existingQ?.notes ?? '',
          };
        }),
      };
    });

    const newRubric = output.rubricCriteria.map((newCrit) => {
      let existingCrit = existingKit.scoringRubric.find(er => er.name === newCrit.name);
      return {
        id: existingCrit?.id || generateId('rubric'),
        name: newCrit.name,
        weight: newCrit.weight,
      };
    });

    return {
      jobDescription: existingKit.jobDescription,
      unstopProfileLink: existingKit.unstopProfileLink,
      unstopProfileDetails: existingKit.unstopProfileDetails,
      candidateResumeDataUri: existingKit.candidateResumeDataUri,
      candidateResumeFileName: existingKit.candidateResumeFileName,
      candidateExperienceContext: existingKit.candidateExperienceContext,
      competencies: newCompetencies,
      scoringRubric: newRubric,
    };
  }, []);


  const handleGenerateKit = useCallback(async (data: JobDescriptionFormSubmitData) => {
    setIsLoading(true);
    setInterviewKit(null);
    setJobDescription(data.jobDescription);
    setUnstopProfileLink(data.unstopProfileLink);
    setUnstopProfileDetails(data.unstopProfileDetails);
    setCandidateResumeDataUri(data.candidateResumeDataUri);
    setCandidateResumeFileName(data.candidateResumeFileName);
    setCandidateExperienceContext(data.candidateExperienceContext);
    setShowInputs(true);

    let inputForAI: GenerateInterviewKitInput | null = null;
    try {
      if (!data.jobDescription.trim()) {
        toast({ variant: "destructive", title: "Input Error", description: "Job description is required." });
        setIsLoading(false);
        return;
      }
      if (!data.unstopProfileLink?.trim()) {
        toast({ variant: "destructive", title: "Input Error", description: "Unstop Profile Link is required." });
        setIsLoading(false);
        return;
      }

      setLoadingMessage("Generating your interview kit...");
      toast({ title: "Generating Kit...", description: "Creating your tailored interview kit." });

      inputForAI = {
        jobDescription: data.jobDescription,
        unstopProfileLink: data.unstopProfileLink,
        unstopProfileDetails: data.unstopProfileDetails,
        candidateResumeDataUri: data.candidateResumeDataUri === null ? undefined : data.candidateResumeDataUri,
        candidateResumeFileName: data.candidateResumeFileName,
        candidateExperienceContext: data.candidateExperienceContext,
      };

      const output = await generateInterviewKit(inputForAI);
      if (output && output.competencies && output.scoringRubric) {
        setInterviewKit(mapOutputToClientKit(output, data.jobDescription, data.unstopProfileLink, data.unstopProfileDetails, data.candidateResumeDataUri, data.candidateResumeFileName, data.candidateExperienceContext));
        toast({ title: "Success!", description: "Interview kit generated." });
        setShowInputs(false);
      } else {
        throw new Error("AI response was empty or malformed.");
      }
    } catch (error) {
      console.error("Error generating interview kit:", error);
      let description = error instanceof Error ? error.message : "An unknown error occurred.";
      if (inputForAI?.candidateResumeDataUri && (description.toLowerCase().includes("media") || description.toLowerCase().includes("parse") || description.toLowerCase().includes("content") || description.toLowerCase().includes("file") || description.toLowerCase().includes("request entity") || description.toLowerCase().includes("document has no pages"))) {
        description = "Error generating kit. The AI couldn't process the resume content. The file might be corrupted, password-protected, or in a very complex format. Please try a different file or generate the kit without a resume.";
      }
      toast({ variant: "destructive", title: "Error Generating Kit", description });
      setInterviewKit(null);
    } finally {
      setIsLoading(false);
    }
  }, [mapOutputToClientKit, toast]);

  const handleCustomizeKit = useCallback(async () => {
    if (!interviewKit) return;
    setIsLoading(true);
    let inputForAI: CustomizeInterviewKitInput | null = null;
    try {
      inputForAI = mapClientKitToCustomizeInput(interviewKit);
      const output = await customizeInterviewKit(inputForAI);
       if (output && output.competencies && output.rubricCriteria) {
        setInterviewKit(mapCustomizeOutputToClientKit(output, interviewKit));
        toast({ title: "Success!", description: "Interview kit updated." });
      } else {
        throw new Error("AI customization response was empty or malformed.");
      }
    } catch (error) {
      console.error("Error customizing interview kit:", error);
      let description = `Failed to update kit. Please try again.`;
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
       if (inputForAI?.candidateResumeDataUri && (errorMessage.includes("media") || errorMessage.includes("parse") || errorMessage.includes("content") || errorMessage.includes("file") || errorMessage.includes("request entity") || errorMessage.includes("document has no pages")) ) {
        description = "Error updating kit. The AI couldn't process the resume content. The file might be corrupted, password-protected, or in a very complex format. Please try generating a new kit with a different file or without one.";
      }
      toast({ variant: "destructive", title: "Error Updating Kit", description });
    } finally {
      setIsLoading(false);
    }
  }, [interviewKit, mapClientKitToCustomizeInput, mapCustomizeOutputToClientKit, toast]);

  const handleKitChange = useCallback((updatedKit: InterviewKit) => {
    setInterviewKit(updatedKit);
  }, []);

  const handleStartOver = () => {
    setJobDescription('');
    setUnstopProfileLink(undefined);
    setUnstopProfileDetails(undefined);
    setCandidateResumeDataUri(undefined);
    setCandidateResumeFileName(undefined);
    setCandidateExperienceContext(undefined);
    setInterviewKit(null);
    setIsLoading(false);
    setShowInputs(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {!interviewKit && <JobDescriptionForm onSubmit={handleGenerateKit} isLoading={isLoading && !interviewKit} />}

          {isLoading && !interviewKit && (
            <div className="flex justify-center py-10">
              <LoadingIndicator text={loadingMessage} />
            </div>
          )}

          {!isLoading && !interviewKit && showInputs && (
             <Card className="mt-8 shadow-lg transition-shadow hover:shadow-xl border-border/70 bg-card">
              <CardHeader>
                <CardTitle className="flex items-center text-xl font-semibold text-primary">
                  <Briefcase className="mr-3 h-6 w-6" />
                  Inputs Provided for Kit Generation
                </CardTitle>
                <CardDescription className="text-muted-foreground">Review the information that was submitted. Generation may have failed or is still in progress if the kit isn't shown.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {jobDescription && (
                  <div>
                    <h3 className="font-medium mb-1 text-foreground flex items-center">
                       <FileText size={16} className="mr-2 text-primary/80"/> Job Description:
                    </h3>
                    <div className="whitespace-pre-wrap text-muted-foreground max-h-48 overflow-y-auto p-3 border rounded-lg bg-input/50 shadow-inner custom-scrollbar">
                      {jobDescription}
                    </div>
                  </div>
                )}
                {unstopProfileLink && (
                  <div>
                    <h3 className="font-medium mb-1 text-foreground flex items-center">
                       <LinkIcon size={16} className="mr-2 text-primary/80"/> Unstop Profile Link:
                    </h3>
                    <div className="whitespace-pre-wrap text-muted-foreground max-h-48 overflow-y-auto p-3 border rounded-lg bg-input/50 shadow-inner custom-scrollbar">
                      {unstopProfileLink}
                    </div>
                  </div>
                )}
                 {unstopProfileDetails && (
                  <div>
                    <h3 className="font-medium mb-1 text-foreground flex items-center">
                       <ClipboardList size={16} className="mr-2 text-primary/80"/> Pasted Unstop Profile Details:
                    </h3>
                    <div className="whitespace-pre-wrap text-muted-foreground max-h-48 overflow-y-auto p-3 border rounded-lg bg-input/50 shadow-inner custom-scrollbar">
                      {unstopProfileDetails}
                    </div>
                  </div>
                )}
                {candidateResumeFileName && candidateResumeDataUri !== null && (
                  <div>
                    <h3 className="font-medium mb-1 text-foreground flex items-center">
                      <FileCheck size={16} className="mr-2 text-green-600"/> Candidate Resume File:
                    </h3>
                    <p className="text-muted-foreground p-3 border rounded-lg bg-input/50 shadow-inner">
                      {candidateResumeFileName} (Content was sent for AI analysis)
                    </p>
                  </div>
                )}
                 {candidateResumeDataUri === null && (
                    <div>
                        <h3 className="font-medium mb-1 text-foreground flex items-center">
                        <AlertTriangle size={16} className="mr-2 text-amber-500"/> Candidate Resume File:
                        </h3>
                        <p className="text-muted-foreground p-3 border rounded-lg bg-input/50 shadow-inner">
                        {candidateResumeFileName ? `${candidateResumeFileName}: ` : ""}A resume file was selected, but could not be processed client-side.
                        </p>
                    </div>
                 )}
                {candidateExperienceContext && (
                  <div>
                    <h3 className="font-medium mb-1 text-foreground flex items-center">
                      <MessageSquare size={16} className="mr-2 text-primary/80"/> Additional Context:
                    </h3>
                    <div className="whitespace-pre-wrap text-muted-foreground max-h-40 overflow-y-auto p-3 border rounded-lg bg-input/50 shadow-inner custom-scrollbar">
                      {candidateExperienceContext}
                    </div>
                  </div>
                )}
                 {!jobDescription && !unstopProfileLink && !candidateResumeFileName && !candidateExperienceContext && candidateResumeDataUri !== null && (
                    <div className="text-center py-4 text-muted-foreground">
                        <AlertTriangle size={20} className="mx-auto mb-2 text-amber-500" />
                        No inputs were provided for generation.
                    </div>
                 )}
              </CardContent>
              <CardFooter>
                 <Button onClick={handleStartOver} variant="outline" className="w-full">Start Over / Clear Inputs</Button>
              </CardFooter>
            </Card>
          )}

          {!isLoading && !interviewKit && !showInputs && (
             <Card className="text-center bg-card shadow-xl border-border/70 transition-shadow hover:shadow-2xl">
              <CardHeader className="pt-8">
                <CardTitle className="text-2xl sm:text-3xl font-headline text-primary flex items-center justify-center">
                 <Zap className="mr-3 h-8 w-8 text-primary/90" /> Welcome to RecruTake
                </CardTitle>
                 <CardDescription className="text-lg text-muted-foreground max-w-xl mx-auto mt-2">
                 Your AI-powered interview assistant.
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-8 pt-2">
                <p className="text-base text-foreground/80 max-w-2xl mx-auto mb-6">
                 Paste a job description, provide the candidate's Unstop profile link, and optionally attach their resume. RecruTake will automatically fetch profile data and instantly generate a tailored interview kit.
                </p>
                 <div className="flex items-center justify-center text-sm text-muted-foreground bg-accent/10 p-3 rounded-lg max-w-md mx-auto">
                    <Info size={18} className="mr-2 text-accent" />
                    Fill the form above to begin.
                </div>
              </CardContent>
            </Card>
          )}

          {interviewKit && (
            <>
            <InterviewKitDisplay
              kit={interviewKit}
              onKitChange={handleKitChange}
              onCustomizeKit={handleCustomizeKit}
              isLoading={isLoading}
            />
            <div className="mt-8 flex justify-center">
                 <Button onClick={handleStartOver} variant="outline" size="lg" className="text-base py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                    Start New Kit / Clear All
                </Button>
            </div>
            </>
          )}
        </div>
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border bg-card/80">
        © {new Date().getFullYear()} RecruTake by Unstop. All rights reserved.
      </footer>
    </div>
  );
}
