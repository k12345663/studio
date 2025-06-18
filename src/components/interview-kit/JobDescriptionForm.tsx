
"use client";

import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Send, FileText, UserCircle, MessageSquare, UploadCloud, LinkIcon, Loader2, FileCheck } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export interface JobDescriptionFormSubmitData {
  jobDescription: string;
  unstopProfileLink?: string;
  candidateResumeDataUri?: string;
  candidateResumeFileName?: string;
  candidateExperienceContext?: string;
}

interface JobDescriptionFormProps {
  onSubmit: (data: JobDescriptionFormSubmitData) => void;
  isLoading: boolean;
}

const SUPPORTED_RESUME_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']; // PDF and DOCX

export function JobDescriptionForm({ onSubmit, isLoading }: JobDescriptionFormProps) {
  const [jobDescription, setJobDescription] = useState('');
  const [unstopProfileLink, setUnstopProfileLink] = useState('');
  const [candidateResumeDataUri, setCandidateResumeDataUri] = useState<string | undefined>(undefined);
  const [candidateResumeFileName, setCandidateResumeFileName] = useState<string | undefined>(undefined);
  const [resumeDisplayMessage, setResumeDisplayMessage] = useState('Select a PDF/DOCX resume for AI analysis, or leave blank if not providing a resume.');
  const [candidateExperienceContext, setCandidateExperienceContext] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsProcessingFile(true);
      setCandidateResumeDataUri(undefined);
      setCandidateResumeFileName(undefined);
      setResumeDisplayMessage(`Processing ${file.name}...`);
      toast({
        title: "Processing Resume",
        description: `Attempting to prepare ${file.name} for AI analysis.`,
      });

      if (!SUPPORTED_RESUME_TYPES.includes(file.type)) {
        setResumeDisplayMessage(
          `File type (${file.type || 'unknown'}) not supported for direct AI analysis. Please use PDF or DOCX, or proceed without a resume file.`
        );
        toast({
          variant: "destructive",
          title: "Unsupported File Type",
          description: "Only PDF and DOCX files are supported for direct resume analysis. You can paste resume text as context if needed.",
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
        setIsProcessingFile(false);
        return;
      }
      
      // Max file size: ~4.5MB for Base64 encoding headroom (Gemini part limit ~5MB)
      const MAX_FILE_SIZE_BYTES = 4.5 * 1024 * 1024; 
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setResumeDisplayMessage(
          `File "${file.name}" is too large (${(file.size / (1024*1024)).toFixed(1)}MB). Maximum size is approx 4.5MB.`
        );
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: "Resume file exceeds the size limit for direct analysis. Consider a smaller file or pasting key text into 'Additional Context'.",
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
        setIsProcessingFile(false);
        return;
      }


      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUri = e.target?.result as string;
          setCandidateResumeDataUri(dataUri);
          setCandidateResumeFileName(file.name);
          setResumeDisplayMessage(`File selected for AI analysis: ${file.name}. Its content will be directly analyzed by the AI.`);
          toast({
            title: "Resume Ready for Analysis!",
            description: `${file.name} has been prepared and will be sent to the AI.`,
          });
          setIsProcessingFile(false);
        };
        reader.onerror = (error) => {
          console.error("Error reading file:", error);
          setResumeDisplayMessage(`Error preparing file ${file.name}. Please try again or a different file. You can also paste resume text into 'Additional Context'.`);
          toast({
            variant: "destructive",
            title: "File Processing Failed",
            description: `Could not prepare ${file.name}. Error: ${error || 'Unknown error'}`,
          });
          setIsProcessingFile(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        };
        reader.readAsDataURL(file); // Reads file as Base64 data URI
      } catch (error) {
        console.error("Error initiating file read:", error);
        setResumeDisplayMessage(
          `Error preparing ${file.name}. This can happen with problematic files. Please try another file or paste key text into 'Additional Context'.`
        );
        toast({
          variant: "destructive",
          title: "File Preparation Failed",
          description: `Could not prepare ${file.name}. Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
        setIsProcessingFile(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } else {
        setCandidateResumeDataUri(undefined);
        setCandidateResumeFileName(undefined);
        setResumeDisplayMessage('Select a PDF/DOCX resume for AI analysis, or leave blank if not providing a resume.');
        setIsProcessingFile(false);
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
    try {
        new URL(unstopProfileLink);
    } catch (_) {
        toast({ variant: "destructive", title: "Invalid URL", description: "Please enter a valid Unstop Profile Link." });
        return;
    }

    if (isProcessingFile) {
        toast({ variant: "destructive", title: "File Processing", description: "Please wait for resume file preparation to complete." });
        return;
    }

    onSubmit({
      jobDescription: jobDescription.trim(),
      unstopProfileLink: unstopProfileLink.trim(),
      candidateResumeDataUri: candidateResumeDataUri,
      candidateResumeFileName: candidateResumeFileName,
      candidateExperienceContext: candidateExperienceContext.trim() || undefined,
    });
  };

  const canSubmit = !isLoading && !isProcessingFile && jobDescription.trim() && unstopProfileLink.trim();

  return (
    <Card className="w-full shadow-xl border border-primary/20">
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-primary flex items-center">
          <FileText className="mr-3 h-7 w-7" /> Create Your Interview Kit
        </CardTitle>
        <CardDescription className="text-base">
          Provide job details, candidate's Unstop profile, and optionally their resume (PDF/DOCX) for direct AI analysis.
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
              disabled={isLoading || isProcessingFile}
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
              disabled={isLoading || isProcessingFile}
              aria-label="Unstop Profile Link Input"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              AI will analyze this profile for tailored questions. Ensure it's a public and valid Unstop profile URL.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="candidate-resume-upload" className="font-semibold text-foreground text-md flex items-center">
               {isProcessingFile && <Loader2 size={18} className="mr-2 text-primary animate-spin"/>}
               {!isProcessingFile && candidateResumeFileName && <FileCheck size={18} className="mr-2 text-green-600"/>}
               {!isProcessingFile && !candidateResumeFileName && <UploadCloud size={18} className="mr-2 text-primary"/>}
               Candidate Resume (PDF/DOCX for direct AI analysis - Optional)
            </Label>
            <Input
              id="candidate-resume-upload"
              type="file"
              ref={fileInputRef}
              accept={SUPPORTED_RESUME_TYPES.join(',')}
              onChange={handleFileChange}
              className="text-sm p-2 rounded-md shadow-sm border h-auto file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              disabled={isLoading || isProcessingFile}
              aria-label="Candidate Resume Upload"
            />
             <div className="mt-1 text-sm p-3 rounded-md shadow-inner bg-muted/50 min-h-[60px] flex items-center justify-center text-center text-muted-foreground">
                {resumeDisplayMessage}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="candidate-experience-context" className="font-semibold text-foreground text-md flex items-center">
              <MessageSquare size={18} className="mr-2 text-primary" /> Additional Candidate Context (Optional)
            </Label>
            <Textarea
              id="candidate-experience-context"
              value={candidateExperienceContext}
              onChange={(e) => setCandidateExperienceContext(e.target.value)}
              placeholder="E.g., 'Targeting senior level, 5+ years experience with microservices' or 'Focus on leadership and communication skills for this role with this candidate.'"
              className="min-h-[100px] text-sm p-3 rounded-md shadow-inner"
              rows={3}
              disabled={isLoading || isProcessingFile}
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
              {isLoading ? 'Generating Kit...' : (isProcessingFile ? 'Preparing Resume...' : 'Generate Interview Kit')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
