
"use client";

import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Send, FileText, UserCircle, MessageSquare, UploadCloud, LinkIcon, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';


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
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Set workerSrc for pdfjs-dist. Using a CDN path.
    // Ensure this version matches the installed pdfjs-dist version if possible, or use a generic one.
    // The version can be found in package-lock.json or by checking pdfjsLib.version
    // For pdfjs-dist v4.x.x, the worker path structure changed slightly.
    // Using unpkg which resolves to the correct path based on version.
     try {
        if (pdfjsLib.GlobalWorkerOptions) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        }
     } catch (error) {
        console.error("Error setting pdf.js worker source:", error);
        toast({
          variant: "destructive",
          title: "PDF Worker Error",
          description: "Could not initialize PDF processing. PDF extraction may fail.",
        });
     }
  }, [toast]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCandidateResumeText(`Processing ${file.name}...`);
      setIsExtracting(true);
      toast({
        title: "Processing Resume",
        description: `Attempting to extract text from ${file.name}.`,
      });

      try {
        const arrayBuffer = await file.arrayBuffer();
        let extractedText = '';

        if (file.type === "application/pdf") {
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          let textContent = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const text = await page.getTextContent();
            textContent += text.items.map((s: any) => s.str).join(' ') + '\n';
          }
          extractedText = textContent;
        } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") { // .docx
          const result = await mammoth.extractRawText({ arrayBuffer });
          extractedText = result.value;
        } else if (file.type === "application/msword") { // .doc
           setCandidateResumeText(
            `File selected: ${file.name}.\n\nIMPORTANT: Automated text extraction for .doc files is not supported by this client-side tool. Please MANUALLY COPY the text content from '${file.name}' and PASTE it into this field, replacing this message. The AI will then analyze the pasted text.`
          );
          toast({
            variant: "default",
            title: ".doc File Selected",
            description: "Automated extraction for .doc is not supported. Please paste text manually.",
          });
          setIsExtracting(false);
          return;
        }
         else {
          setCandidateResumeText(
            `File selected: ${file.name}.\n\nUnsupported file type for automatic extraction. Please MANUALLY COPY the text content if it's a resume and PASTE it here.`
          );
          toast({
            variant: "destructive",
            title: "Unsupported File Type",
            description: "Please upload a PDF or DOCX for automatic extraction, or paste text manually.",
          });
          if(fileInputRef.current) fileInputRef.current.value = "";
          setIsExtracting(false);
          return;
        }

        if (extractedText.trim()) {
          setCandidateResumeText(extractedText);
          toast({
            title: "Text Extracted Successfully!",
            description: `Text from ${file.name} has been loaded.`,
          });
        } else {
          setCandidateResumeText(
            `Could not automatically extract text from ${file.name}, or the file is empty. Please MANUALLY COPY the text content from your resume and PASTE it here.`
          );
          toast({
            variant: "destructive",
            title: "Extraction Issue",
            description: `No text could be extracted from ${file.name}, or the file is empty. Please paste manually.`,
          });
        }
      } catch (error) {
        console.error("Error extracting text:", error);
        setCandidateResumeText(
          `Error extracting text from ${file.name}. This can happen with complex or password-protected files. Please MANUALLY COPY the text content from your resume and PASTE it here.`
        );
        toast({
          variant: "destructive",
          title: "Extraction Failed",
          description: `Could not extract text from ${file.name}. Please paste manually. Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      } finally {
        setIsExtracting(false);
        if(fileInputRef.current) fileInputRef.current.value = ""; // Reset file input so same file can be re-selected if needed
      }
    } else {
        setCandidateResumeText(''); // Clear if no file is selected or selection is cancelled
        setIsExtracting(false);
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

    if (candidateResumeText.startsWith("Processing ") && candidateResumeText.includes("...")) {
        toast({ variant: "destructive", title: "Resume Processing", description: "Please wait for resume text extraction to complete or paste text manually." });
        return;
    }

    onSubmit({
      jobDescription: jobDescription.trim(),
      unstopProfileLink: unstopProfileLink.trim(),
      candidateResumeText: candidateResumeText.trim() || undefined,
      candidateExperienceContext: candidateExperienceContext.trim() || undefined,
    });
  };

  const canSubmit = !isLoading && !isExtracting && jobDescription.trim() && unstopProfileLink.trim();

  return (
    <Card className="w-full shadow-xl border border-primary/20">
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-primary flex items-center">
          <FileText className="mr-3 h-7 w-7" /> Create Your Interview Kit
        </CardTitle>
        <CardDescription className="text-base">
          Provide job details, candidate's Unstop profile, and optionally their resume (PDF/DOCX for auto-extraction, or paste text).
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
              disabled={isLoading || isExtracting}
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
              disabled={isLoading || isExtracting}
              aria-label="Unstop Profile Link Input"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              AI will analyze this profile for tailored questions. Ensure it's a public and valid Unstop profile URL.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="candidate-resume-upload" className="font-semibold text-foreground text-md flex items-center">
              <UploadCloud size={18} className="mr-2 text-primary" /> Candidate Resume (PDF/DOCX supported for auto-extraction - Optional)
            </Label>
            <Input
              id="candidate-resume-upload"
              type="file"
              ref={fileInputRef}
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
              onChange={handleFileChange}
              className="text-sm p-2 rounded-md shadow-sm border h-auto file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              disabled={isLoading || isExtracting}
              aria-label="Candidate Resume Upload"
            />
             <p className="text-xs text-muted-foreground mt-1">
              Select a PDF or DOCX file for automatic text extraction. For .doc files or if extraction fails, please paste text manually below.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="candidate-resume-text" className="font-semibold text-foreground text-md flex items-center">
             {isExtracting && <Loader2 size={18} className="mr-2 text-primary animate-spin"/>}
             {!isExtracting && <UserCircle size={18} className="mr-2 text-primary"/>}
              Candidate Resume Text (Populated by upload or paste manually)
            </Label>
            <Textarea
              id="candidate-resume-text"
              value={candidateResumeText}
              onChange={(e) => setCandidateResumeText(e.target.value)}
              placeholder="Select a PDF/DOCX above for auto-extraction, or paste the candidate's full resume text here."
              className="min-h-[150px] text-sm p-3 rounded-md shadow-inner"
              rows={6}
              disabled={isLoading || isExtracting}
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
              disabled={isLoading || isExtracting}
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
              {isLoading ? 'Generating Kit...' : (isExtracting ? 'Processing Resume...' : 'Generate Interview Kit')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
