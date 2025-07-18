
"use client";

import type React from 'react';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Send, FileText, LinkIcon, MessageSquare, UploadCloud, Loader2, FileCheck, Paperclip, AlertTriangle, ClipboardList } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Textarea } from '@/components/ui/textarea';


export interface JobDescriptionFormSubmitData {
  jobDescription: string;
  unstopProfileLink?: string;
  unstopProfileDetails?: string;
  candidateResumeDataUri?: string | null;
  candidateResumeFileName?: string;
  candidateExperienceContext?: string;
}

interface JobDescriptionFormProps {
  onSubmit: (data: JobDescriptionFormSubmitData) => void;
  isLoading: boolean;
}

const SUPPORTED_RESUME_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_FILE_SIZE_MB = 4.5;

export function JobDescriptionForm({ onSubmit, isLoading }: JobDescriptionFormProps) {
  const [jobDescription, setJobDescription] = useState('');
  const [unstopProfileLink, setUnstopProfileLink] = useState('');
  const [unstopProfileDetails, setUnstopProfileDetails] = useState('');
  const [candidateResumeDataUri, setCandidateResumeDataUri] = useState<string | undefined | null>(undefined);
  const [candidateResumeFileName, setCandidateResumeFileName] = useState<string | undefined>(undefined);
  const [resumeDisplayMessage, setResumeDisplayMessage] = useState(`Attach resume (PDF/DOCX, max ${MAX_FILE_SIZE_MB}MB) or leave blank.`);
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
        description: `Preparing ${file.name} for AI analysis.`,
      });

      if (!SUPPORTED_RESUME_TYPES.includes(file.type)) {
        setResumeDisplayMessage(
          `File type (${file.type || 'unknown'}) not supported. Please use PDF or DOCX (max ${MAX_FILE_SIZE_MB}MB).`
        );
        toast({
          variant: "destructive",
          title: "Unsupported File Type",
          description: "Only PDF and DOCX files are supported for resume analysis.",
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
        setIsProcessingFile(false);
        setCandidateResumeDataUri(null); 
        setCandidateResumeFileName(file.name);
        return;
      }

      const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setResumeDisplayMessage(
          `File "${file.name}" (${(file.size / (1024*1024)).toFixed(1)}MB) is too large. Max size is ${MAX_FILE_SIZE_MB}MB.`
        );
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: `Resume file exceeds the ${MAX_FILE_SIZE_MB}MB limit. Please use a smaller file.`,
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
        setIsProcessingFile(false);
        setCandidateResumeDataUri(null); 
        setCandidateResumeFileName(file.name);
        return;
      }

      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUri = e.target?.result as string;
          setCandidateResumeDataUri(dataUri);
          setCandidateResumeFileName(file.name);
          setResumeDisplayMessage(`${file.name} attached for AI analysis.`);
          toast({
            title: "Resume Ready!",
            description: `${file.name} will be sent to the AI.`,
          });
          setIsProcessingFile(false);
        };
        reader.onerror = (error) => {
          console.error("Error reading file:", error);
          setResumeDisplayMessage(`Error preparing ${file.name}. Please try again (PDF/DOCX, max ${MAX_FILE_SIZE_MB}MB).`);
          toast({
            variant: "destructive",
            title: "File Processing Failed",
            description: `Unable to read resume file. Please try another file.`,
          });
          setIsProcessingFile(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
          setCandidateResumeDataUri(null); 
          setCandidateResumeFileName(file.name);
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error("Error initiating file read:", error);
        setResumeDisplayMessage(
          `Error preparing ${file.name}. Please try another file (PDF/DOCX, max ${MAX_FILE_SIZE_MB}MB).`
        );
        toast({
          variant: "destructive",
          title: "File Preparation Failed",
          description: `Could not prepare ${file.name}. Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
        setIsProcessingFile(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setCandidateResumeDataUri(null);
        setCandidateResumeFileName(file.name);
      }
    } else {
        setCandidateResumeDataUri(undefined);
        setCandidateResumeFileName(undefined);
        setResumeDisplayMessage(`Attach resume (PDF/DOCX, max ${MAX_FILE_SIZE_MB}MB) or leave blank.`);
        setIsProcessingFile(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobDescription.trim()) {
      toast({ variant: "destructive", title: "Missing Input", description: "Job Description is required." });
      return;
    }
    const alphanumericPattern = /[a-zA-Z0-9]/;
    if (!alphanumericPattern.test(jobDescription)) {
        toast({ variant: "destructive", title: "Invalid Input", description: "JD must contain valid text." });
        return;
    }
    if (!unstopProfileLink.trim()) {
      toast({ variant: "destructive", title: "Missing Input", description: "Unstop Profile Link is required." });
      return;
    }

    let parsedUrl;
    try {
        parsedUrl = new URL(unstopProfileLink);
    } catch (_) {
        toast({ variant: "destructive", title: "Invalid URL Format", description: "Please enter a valid URL for the Unstop Profile (e.g., https://unstop.com/...). " });
        return;
    }

    if (parsedUrl.hostname !== 'unstop.com' && !parsedUrl.hostname.endsWith('.unstop.com')) {
        toast({ variant: "destructive", title: "Invalid Unstop URL", description: "The URL must be from the unstop.com domain." });
        return;
    }

    if (parsedUrl.pathname === '/' || parsedUrl.pathname === '') {
       toast({ variant: "destructive", title: "Invalid Unstop Profile Path", description: "The Unstop URL does not appear to point to a specific profile page. Please provide a full profile URL." });
       return;
    }


    if (isProcessingFile) {
        toast({ variant: "destructive", title: "File Processing", description: "Please wait for resume file preparation to complete." });
        return;
    }

    onSubmit({
      jobDescription: jobDescription.trim(),
      unstopProfileLink: unstopProfileLink.trim(),
      unstopProfileDetails: unstopProfileDetails.trim() || undefined,
      candidateResumeDataUri: candidateResumeDataUri,
      candidateResumeFileName: candidateResumeFileName,
      candidateExperienceContext: candidateExperienceContext.trim() || undefined,
    });
  };

  const triggerFileSelect = () => {
    if (isProcessingFile || isLoading) return;
    fileInputRef.current?.click();
  }

  const canSubmit = !isLoading && !isProcessingFile && jobDescription.trim() && unstopProfileLink.trim();

  return (
    <Card className="w-full shadow-xl border-border/70 bg-card">
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-primary flex items-center">
          <FileText className="mr-3 h-7 w-7" /> Create Your Interview Kit
        </CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          Provide job details, candidate's Unstop profile, and optionally their resume for direct AI analysis.
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
              className="min-h-[180px] text-sm p-3 rounded-lg shadow-inner bg-input/80 focus:bg-background"
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
              className="text-sm p-3 rounded-lg shadow-inner bg-input/80 focus:bg-background"
              disabled={isLoading || isProcessingFile}
              aria-label="Unstop Profile Link Input"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="unstop-profile-details" className="font-semibold text-foreground text-md flex items-center">
              <ClipboardList size={18} className="mr-2 text-primary" /> Unstop Profile Details (Optional)
            </Label>
            <Textarea
              id="unstop-profile-details"
              value={unstopProfileDetails}
              onChange={(e) => setUnstopProfileDetails(e.target.value)}
              placeholder="For best results, paste the candidate's skills, experience, and projects from their Unstop profile here."
              className="min-h-[150px] text-sm p-3 rounded-lg shadow-inner bg-input/80 focus:bg-background"
              rows={6}
              disabled={isLoading || isProcessingFile}
              aria-label="Unstop Profile Details Text Input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="candidate-resume-upload-trigger" className="font-semibold text-foreground text-md flex items-center">
               <Paperclip size={18} className="mr-2 text-primary"/> Candidate Resume (PDF/DOCX - Optional, Max {MAX_FILE_SIZE_MB}MB)
            </Label>
            <Input
              id="candidate-resume-upload"
              type="file"
              ref={fileInputRef}
              accept={SUPPORTED_RESUME_TYPES.join(',')}
              onChange={handleFileChange}
              className="hidden"
              disabled={isLoading || isProcessingFile}
              aria-label="Candidate Resume Upload Hidden"
            />
             <Button
                type="button"
                variant="outline"
                onClick={triggerFileSelect}
                disabled={isLoading || isProcessingFile}
                className="w-full justify-start text-muted-foreground hover:text-foreground border-dashed border-input hover:border-primary"
                id="candidate-resume-upload-trigger"
                aria-label="Choose resume file"
                suppressHydrationWarning={true} 
              >
                {isProcessingFile && <Loader2 size={16} className="mr-2 animate-spin"/>}
                {!isProcessingFile && candidateResumeDataUri && candidateResumeFileName && candidateResumeDataUri !== null && <FileCheck size={16} className="mr-2 text-green-600"/>}
                {!isProcessingFile && (candidateResumeDataUri === undefined || !candidateResumeFileName) && <UploadCloud size={16} className="mr-2"/>}
                {candidateResumeDataUri === null && candidateResumeFileName && <AlertTriangle size={16} className="mr-2 text-amber-500"/> }
                {resumeDisplayMessage}
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="candidate-experience-context" className="font-semibold text-foreground text-md flex items-center">
              <MessageSquare size={18} className="mr-2 text-primary" /> Additional Candidate Context (Optional)
            </Label>
            <Textarea
              id="candidate-experience-context"
              value={candidateExperienceContext}
              onChange={(e) => setCandidateExperienceContext(e.target.value)}
              placeholder="E.g., 'Targeting senior level, 5+ years with microservices' or 'Focus on leadership for this role with this candidate.'"
              className="min-h-[100px] text-sm p-3 rounded-lg shadow-inner bg-input/80 focus:bg-background"
              rows={3}
              disabled={isLoading || isProcessingFile}
              aria-label="Additional Candidate Experience Context Input"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full sm:w-auto text-base py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-shadow bg-primary hover:bg-primary/90 text-primary-foreground"
              size="lg"
            >
              {(isLoading && !isProcessingFile) ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Send className="mr-2 h-5 w-5" />}
              {(isLoading && !isProcessingFile) ? 'Generate Interview Kit' : (isProcessingFile ? 'Preparing Resume...' : 'Generate Interview Kit')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
