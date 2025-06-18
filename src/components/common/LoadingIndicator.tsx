
import { Loader2, Zap } from 'lucide-react';

interface LoadingIndicatorProps {
  text?: string;
}

export function LoadingIndicator({ text = "Processing..." }: LoadingIndicatorProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8 bg-card rounded-xl shadow-2xl border border-primary/30 max-w-md mx-auto">
      <div className="relative">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <Zap className="h-8 w-8 text-accent opacity-75 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-ping" />
      </div>
      <p className="text-xl font-medium text-foreground text-center">{text}</p>
      <p className="text-sm text-muted-foreground">This may take a few moments.</p>
    </div>
  );
}
