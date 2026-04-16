"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

interface ReprocessReservationButtonProps {
  reservationId: string;
}

export function ReprocessReservationButton({
  reservationId,
}: ReprocessReservationButtonProps) {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleReprocess = useCallback(async () => {
    setStep("loading");
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/reservas/${reservationId}/reprocess`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao reprocessar reserva");
      }

      setStep("done");
      router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setStep("error");
    }
  }, [reservationId, router]);

  if (step === "done") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-status-success/20 bg-status-success/5 px-4 py-3">
        <CheckCircle2 className="h-4 w-4 text-status-success" strokeWidth={2} />
        <div className="flex-1">
          <p className="text-[13px] font-medium text-text-primary">
            Reprocessamento concluído
          </p>
          <p className="text-[12px] text-text-muted">
            A análise foi re-executada e o CVCRM foi atualizado
          </p>
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-status-error/20 bg-status-error/5 px-4 py-3">
        <AlertTriangle className="h-4 w-4 text-status-error" strokeWidth={2} />
        <div className="flex-1">
          <p className="text-[13px] font-medium text-text-primary">
            Erro ao reprocessar
          </p>
          <p className="text-[12px] text-text-muted">{errorMessage}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setStep("idle")}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (step === "loading") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
        <Loader2 className="h-4 w-4 text-primary animate-spin" strokeWidth={2} />
        <p className="text-[13px] text-text-muted">Reprocessando análise...</p>
      </div>
    );
  }

  return (
    <Button variant="outline" onClick={handleReprocess} className="gap-2">
      <RefreshCw className="h-4 w-4" strokeWidth={2} />
      Reprocessar Análise
    </Button>
  );
}
