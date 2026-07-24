"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  fullPage?: boolean;
}

export function ErrorState({
  title = "May error na nangyari",
  message = "Hindi makuha ang data. Pakisubukan muli.",
  onRetry,
  fullPage = false,
}: ErrorStateProps) {
  const content = (
    <div className="flex flex-col items-center justify-center text-center p-8">
      <div className="h-16 w-16 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center mb-4">
        <AlertTriangle className="h-8 w-8 text-red-400 dark:text-red-400" />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          className="mt-4 rounded-xl"
          onClick={onRetry}
          aria-label="Subukan muli"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Subukan Muli
        </Button>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        {content}
      </div>
    );
  }

  return content;
}