"use client";

import type React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Send } from 'lucide-react';

interface JobDescriptionFormProps {
  onSubmit: (jobDescription: string) => void;
  isLoading: boolean;
}

export function JobDescriptionForm({ onSubmit, isLoading }: JobDescriptionFormProps) {
  const [jobDescription, setJobDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (jobDescription.trim()) {
      onSubmit(jobDescription.trim());
    }
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Create Interview Kit</CardTitle>
        <CardDescription>
          Paste your job description below to generate a tailored interview kit.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="job-description" className="text-lg font-medium">
              Job Description
            </Label>
            <Textarea
              id="job-description"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here..."
              className="mt-2 min-h-[200px] text-sm"
              rows={10}
              disabled={isLoading}
              aria-label="Job Description Input"
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading || !jobDescription.trim()}
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
