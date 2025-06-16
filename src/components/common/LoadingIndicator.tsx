import { Loader2, Zap } from 'lucide-react';

interface LoadingIndicatorProps {
  text?: string;
}

export function LoadingIndicator({ text = "Processing..." }: LoadingIndicatorProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-6 p-10 bg-card rounded-lg shadow-xl border border-primary/20">
      <div className="relative">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <Zap className="h-8 w-8 text-primary/70 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-ping opacity-75" />
      </div>
      <p className="text-xl font-medium text-foreground animate-pulse">{text}</p>
      <p className="text-sm text-muted-foreground">This may take a few moments.</p>
    </div>
  );
}
