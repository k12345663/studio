import { FileText } from 'lucide-react';

export function AppHeader() {
  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="ml-3 text-2xl font-headline font-semibold text-foreground">
              InterviewAI
            </h1>
          </div>
          {/* Future placeholder for nav items or user profile */}
        </div>
      </div>
    </header>
  );
}
