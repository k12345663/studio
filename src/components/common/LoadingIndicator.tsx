import { Loader2 } from 'lucide-react';

interface LoadingIndicatorProps {
  text?: string;
}

export function LoadingIndicator({ text = "Processing..." }: LoadingIndicatorProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8 bg-card rounded-lg shadow-md">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="text-lg font-medium text-foreground">{text}</p>
    </div>
  );
}
