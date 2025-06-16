
"use client";

import type React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Send } from 'lucide-react';

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
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Create Interview Kit</CardTitle>
        <CardDescription>
          Paste the job description, candidate resume (optional), and any additional context about the target candidate.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="job-description-text" className="font-medium">
              Paste Job Description
            </Label>
            <Textarea
              id="job-description-text"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here..."
              className="min-h-[150px] text-sm"
              rows={8}
              disabled={isLoading}
              aria-label="Job Description Text Input"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="candidate-resume-text" className="font-medium">
              Paste Candidate Resume (Optional)
            </Label>
            <Textarea
              id="candidate-resume-text"
              value={candidateResume}
              onChange={(e) => setCandidateResume(e.target.value)}
              placeholder="Paste the candidate's full resume here to tailor questions..."
              className="min-h-[120px] text-sm"
              rows={6}
              disabled={isLoading}
              aria-label="Candidate Resume Text Input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="candidate-experience-context" className="font-medium">
              Additional Candidate Context (Optional)
            </Label>
            <Textarea
              id="candidate-experience-context"
              value={candidateExperienceContext}
              onChange={(e) => setCandidateExperienceContext(e.target.value)}
              placeholder="E.g., 'Focus on their leadership potential.' or 'Verify specific project experience mentioned in resume.'"
              className="min-h-[80px] text-sm"
              rows={3}
              disabled={isLoading}
              aria-label="Additional Candidate Experience Context Input"
            />
          </div>

          <Button
            type="submit"
            disabled={!canSubmit}
            className="w-full sm:w-auto text-base"
            size="lg"
          >
            <Send className="mr-2 h-5 w-5" />
            {isLoading ? 'Generating Kit...' : 'Generate Interview Kit'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
