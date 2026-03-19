"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivateError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error-boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30">
        <AlertTriangle className="h-6 w-6 text-red-500" strokeWidth={2} />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">
          Algo deu errado
        </h2>
        <p className="text-sm text-text-muted max-w-md">
          {error.message || "Ocorreu um erro inesperado ao carregar esta página."}
        </p>
        {error.digest && (
          <p className="text-xs text-text-muted font-mono">
            Digest: {error.digest}
          </p>
        )}
      </div>
      <Button onClick={reset} variant="outline" size="sm">
        Tentar novamente
      </Button>
    </div>
  );
}
