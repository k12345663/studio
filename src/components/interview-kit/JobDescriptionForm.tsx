
"use client";

import type React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Send, FileUp, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


interface JobDescriptionFormProps {
  onSubmit: (data: string | File) => void;
  isLoading: boolean;
}

export function JobDescriptionForm({ onSubmit, isLoading }: JobDescriptionFormProps) {
  const [jobDescription, setJobDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === "application/pdf") {
        setSelectedFile(file);
        setFileName(file.name);
        setJobDescription(''); // Clear textarea if a file is selected
      } else {
        alert("Please select a PDF file.");
        e.target.value = ''; // Reset file input
        setSelectedFile(null);
        setFileName('');
      }
    } else {
      setSelectedFile(null);
      setFileName('');
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJobDescription(e.target.value);
    if (e.target.value && selectedFile) {
        setSelectedFile(null); // Clear file if text is entered
        setFileName('');
        const fileInput = document.getElementById('job-description-pdf') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFile) {
      onSubmit(selectedFile);
    } else if (jobDescription.trim()) {
      onSubmit(jobDescription.trim());
    }
  };

  const canSubmit = !isLoading && (selectedFile || jobDescription.trim());

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Create Interview Kit</CardTitle>
        <CardDescription>
          Paste your job description below or upload a PDF to generate a tailored interview kit.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="job-description-pdf">
              Upload Job Description PDF
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-x-2 gap-y-1 items-center">
              <Input
                id="job-description-pdf"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="w-full file:text-primary file:text-sm file:font-medium file:mr-3 file:py-2 file:px-3 file:border-0 file:bg-transparent hover:file:text-primary/80 disabled:opacity-50"
                disabled={isLoading}
                aria-label="Job Description PDF Upload"
              />
              {fileName && (
                <span className="text-sm text-muted-foreground truncate self-center">
                  {fileName}
                </span>
              )}
            </div>
          </div>

          <div className="relative flex items-center">
            <span className="flex-shrink px-4 text-muted-foreground text-sm">OR</span>
            <div className="flex-grow border-t border-border"></div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="job-description-text">
              Paste Job Description
            </Label>
            <Textarea
              id="job-description-text"
              value={jobDescription}
              onChange={handleTextChange}
              placeholder="Paste the full job description here..."
              className="min-h-[150px] text-sm"
              rows={8}
              disabled={isLoading}
              aria-label="Job Description Text Input"
            />
          </div>

           {selectedFile && jobDescription && (
             <Alert variant="default" className="bg-accent/10 border-accent/50">
              <Info className="h-4 w-4 !text-accent" />
              <AlertTitle className="text-accent">Input Preference</AlertTitle>
              <AlertDescription className="text-accent/90">
                You've both uploaded a PDF and pasted text. The PDF will be used. Clear the PDF selection if you'd prefer to use the pasted text.
              </AlertDescription>
            </Alert>
           )}

          <Button
            type="submit"
            disabled={!canSubmit}
            className="w-full sm:w-auto text-base"
            size="lg"
          >
            {selectedFile ? <FileUp className="mr-2 h-5 w-5" /> : <Send className="mr-2 h-5 w-5" /> }
            {isLoading ? 'Generating Kit...' : (selectedFile ? 'Generate from PDF' : 'Generate from Text')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
