
"use client";

import type React from 'react';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Send, FileText, UserCircle, MessageSquare, UploadCloud, LinkIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";


export interface JobDescriptionFormSubmitData {
  jobDescription: string;
  unstopProfileLink?: string;
  candidateResumeText?: string;
  candidateExperienceContext?: string;
}

interface JobDescriptionFormProps {
  onSubmit: (data: JobDescriptionFormSubmitData) => void;
  isLoading: boolean;
}

export function JobDescriptionForm({ onSubmit, isLoading }: JobDescriptionFormProps) {
  const [jobDescription, setJobDescription] = useState('');
  const [unstopProfileLink, setUnstopProfileLink] = useState('');
  const [candidateResumeText, setCandidateResumeText] = useState('');
  const [candidateExperienceContext, setCandidateExperienceContext] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === "application/pdf" || file.type === "application/msword" || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        // In a real application, you'd send this file to a backend for text extraction.
        // For now, we'll simulate this by asking the user to paste the text.
        toast({
          title: "File Selected: " + file.name,
          description: "For this demo, please manually copy and paste the resume text into the 'Candidate Resume Text' field below after selecting a file. Full file processing is a future enhancement.",
        });
        // You could try to read basic text if it's a .txt, but PDF/DOCX need server-side.
        // For simplicity, we just inform the user.
        setCandidateResumeText(`(Text from ${file.name} would be extracted here. Please paste manually for now.)\n`);
      } else {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please upload a PDF, DOC, or DOCX file.",
        });
        if(fileInputRef.current) {
            fileInputRef.current.value = ""; // Reset file input
        }
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobDescription.trim()) {
      toast({ variant: "destructive", title: "Missing Input", description: "Job description is required." });
      return;
    }
    if (!unstopProfileLink.trim()) {
      toast({ variant: "destructive", title: "Missing Input", description: "Unstop Profile Link is required." });
      return;
    }
    // Basic URL validation for Unstop link (can be enhanced)
    try {
        new URL(unstopProfileLink);
    } catch (_) {
        toast({ variant: "destructive", title: "Invalid URL", description: "Please enter a valid Unstop Profile Link." });
        return;
    }

    onSubmit({
      jobDescription: jobDescription.trim(),
      unstopProfileLink: unstopProfileLink.trim(),
      candidateResumeText: candidateResumeText.trim() || undefined,
      candidateExperienceContext: candidateExperienceContext.trim() || undefined,
    });
  };

  const canSubmit = !isLoading && jobDescription.trim() && unstopProfileLink.trim();

  return (
    <Card className="w-full shadow-xl border border-primary/20">
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-primary flex items-center">
          <FileText className="mr-3 h-7 w-7" /> Create Your Interview Kit
        </CardTitle>
        <CardDescription className="text-base">
          Provide the job details, candidate's Unstop profile, and optionally upload their resume.
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
            <Label htmlFor="unstop-profile-link" className="font-semibold text-foreground text-md flex items-center">
              <LinkIcon size={18} className="mr-2 text-primary" /> Unstop Profile Link <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="unstop-profile-link"
              type="url"
              value={unstopProfileLink}
              onChange={(e) => setUnstopProfileLink(e.target.value)}
              placeholder="https://unstop.com/p/candidate-profile-link..."
              className="text-sm p-3 rounded-md shadow-inner"
              disabled={isLoading}
              aria-label="Unstop Profile Link Input"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              AI will analyze this profile for tailored questions. Ensure it's a public and valid Unstop profile URL.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="candidate-resume-upload" className="font-semibold text-foreground text-md flex items-center">
              <UploadCloud size={18} className="mr-2 text-primary" /> Candidate Resume (PDF/DOC - Optional)
            </Label>
            <Input
              id="candidate-resume-upload"
              type="file"
              ref={fileInputRef}
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
              className="text-sm p-2 rounded-md shadow-sm border h-auto file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              disabled={isLoading}
              aria-label="Candidate Resume Upload"
            />
             <p className="text-xs text-muted-foreground mt-1">
              If you upload a resume, its text content will be used by the AI. For now, after selecting a file, please also paste its text into the field below. Full automated text extraction is a planned future enhancement.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="candidate-resume-text" className="font-semibold text-foreground text-md flex items-center">
              <UserCircle size={18} className="mr-2 text-primary" /> Candidate Resume Text (Optional - Paste if uploaded or in lieu of upload)
            </Label>
            <Textarea
              id="candidate-resume-text"
              value={candidateResumeText}
              onChange={(e) => setCandidateResumeText(e.target.value)}
              placeholder="If you uploaded a resume, paste its text content here. Or, paste resume text directly if not uploading a file. Include project details, tech stack, goals, accomplishments, challenges, educational background, and past work experiences."
              className="min-h-[150px] text-sm p-3 rounded-md shadow-inner"
              rows={6}
              disabled={isLoading}
              aria-label="Candidate Resume Text Input or Profile Details"
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
