
"use client";

import type React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Send, FileText, UserCircle, MessageSquare } from 'lucide-react';

export interface JobDescriptionFormSubmitData {
  jobDescription: string;
  candidateExperienceContext?: string;
  candidateResume?: string;
}

interface JobDescriptionFormProps {
  onSubmit: (data: JobDescriptionFormSubmitData) => void;
  isLoading: boolean;
}

export function JobDescriptionForm({ onSubmit, isLoading }: JobDescriptionFormProps) {
  const [jobDescription, setJobDescription] = useState('');
  const [candidateExperienceContext, setCandidateExperienceContext] = useState('');
  const [candidateResume, setCandidateResume] = useState('');


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (jobDescription.trim()) {
      onSubmit({
        jobDescription: jobDescription.trim(),
        candidateExperienceContext: candidateExperienceContext.trim() || undefined,
        candidateResume: candidateResume.trim() || undefined,
      });
    }
  };

  const canSubmit = !isLoading && jobDescription.trim();

  return (
    <Card className="w-full shadow-xl border border-primary/20">
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-primary flex items-center">
          <FileText className="mr-3 h-7 w-7" /> Create Your Interview Kit
        </CardTitle>
        <CardDescription className="text-base">
          Provide the job details, candidate's resume (optional), and any extra context to generate a tailored interview kit.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="job-description-text" className="font-semibold text-foreground text-md flex items-center">
              <FileText size={18} className="mr-2 text-primary" /> Job Description <span className="text-red-500 ml-1">*</span>
            </Label>
            <Textarea
              id="job-description-text"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here..."
              className="min-h-[180px] text-sm p-3 rounded-md shadow-inner"
              rows={8}
              disabled={isLoading}
              aria-label="Job Description Text Input"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="candidate-resume-text" className="font-semibold text-foreground text-md flex items-center">
              <UserCircle size={18} className="mr-2 text-primary" /> Candidate Resume (Optional)
            </Label>
            <Textarea
              id="candidate-resume-text"
              value={candidateResume}
              onChange={(e) => setCandidateResume(e.target.value)}
              placeholder="Paste the candidate's full resume here to tailor questions and answers..."
              className="min-h-[150px] text-sm p-3 rounded-md shadow-inner"
              rows={6}
              disabled={isLoading}
              aria-label="Candidate Resume Text Input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="candidate-experience-context" className="font-semibold text-foreground text-md flex items-center">
              <MessageSquare size={18} className="mr-2 text-primary" /> Additional Candidate Context (Optional)
            </Label>
            <Textarea
              id="candidate-experience-context"
              value={candidateExperienceContext}
              onChange={(e) => setCandidateExperienceContext(e.target.value)}
              placeholder="E.g., 'Targeting senior level, 5+ years experience with microservices' or 'Focus on leadership and communication skills.'"
              className="min-h-[100px] text-sm p-3 rounded-md shadow-inner"
              rows={3}
              disabled={isLoading}
              aria-label="Additional Candidate Experience Context Input"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full sm:w-auto text-base py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
              size="lg"
            >
              <Send className="mr-2 h-5 w-5" />
              {isLoading ? 'Generating Kit...' : 'Generate Interview Kit'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
