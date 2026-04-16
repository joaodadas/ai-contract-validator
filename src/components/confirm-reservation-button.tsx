"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2, X, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";

interface ConfirmReservationButtonProps {
  reservationId: string;
  idSituacao?: number;
  situacaoLabel?: string;
  isOverride?: boolean;
}

const DEFAULT_SITUACAO_ID = 2;
const DEFAULT_SITUACAO_LABEL = "02 - [COM] Contrato Gerado";

export function ConfirmReservationButton({
  reservationId,
  idSituacao = DEFAULT_SITUACAO_ID,
  situacaoLabel = DEFAULT_SITUACAO_LABEL,
  isOverride = false,
}: ConfirmReservationButtonProps) {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "confirming" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<{
    synced: boolean;
    reason?: string;
    error?: string;
  } | null>(null);

  const handleConfirm = useCallback(async () => {
    setStep("loading");
    try {
      const res = await fetch(`/api/reservas/${reservationId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idSituacao, situacaoLabel }),
      });

      if (!res.ok) {
        let message = "Erro ao confirmar reserva";
        try {
          const data = await res.json();
          message = data.error ?? message;
        } catch {
          if (res.status === 401) message = "Sessão expirada — faça login novamente";
          else if (res.status >= 500) message = "Erro no servidor — tente novamente em alguns segundos";
        }
        throw new Error(message);
      }

      const data = await res.json();
      setResult(data);
      setStep("done");
      router.refresh();
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const friendly = raw.includes("Failed to execute") || raw.includes("fetch")
        ? "Falha na comunicação com o servidor — verifique sua conexão e tente novamente"
        : raw;
      setResult({
        synced: false,
        error: friendly,
      });
      setStep("error");
    }
  }, [reservationId, idSituacao, situacaoLabel, router]);

  if (step === "done" && result) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-status-success/20 bg-status-success/5 px-4 py-3">
        <CheckCircle2 className="h-4 w-4 text-status-success" strokeWidth={2} />
        <div className="flex-1">
          <p className="text-[13px] font-medium text-text-primary">
            Reserva confirmada
          </p>
          <p className="text-[12px] text-text-muted">
            {result.synced
              ? "Situação sincronizada com o CVCRM"
              : "Sync com CVCRM desativado (será sincronizado quando ativado)"}
          </p>
        </div>
      </div>
    );
  }

  if (step === "error" && result) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-status-error/20 bg-status-error/5 px-4 py-3">
        <AlertTriangle className="h-4 w-4 text-status-error" strokeWidth={2} />
        <div className="flex-1">
          <p className="text-[13px] font-medium text-text-primary">
            Erro ao confirmar
          </p>
          <p className="text-[12px] text-text-muted">{result.error}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStep("idle")}
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (step === "confirming") {
    return (
      <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
        isOverride
          ? "border-amber-500/20 bg-amber-500/5"
          : "border-primary/20 bg-primary/5"
      }`}>
        {isOverride ? (
          <ShieldAlert className="h-4 w-4 text-amber-600" strokeWidth={2} />
        ) : (
          <ShieldCheck className="h-4 w-4 text-primary" strokeWidth={2} />
        )}
        <div className="flex-1">
          <p className="text-[13px] font-medium text-text-primary">
            {isOverride
              ? "Aprovar manualmente mesmo com divergências?"
              : "Confirmar aprovação?"}
          </p>
          <p className="text-[12px] text-text-muted">
            {isOverride
              ? "As divergências encontradas pela IA serão ignoradas"
              : `Situação CVCRM: ${situacaoLabel}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep("idle")}
          >
            <X className="h-3.5 w-3.5" />
            Cancelar
          </Button>
          <Button size="sm" onClick={handleConfirm}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            Confirmar
          </Button>
        </div>
      </div>
    );
  }

  if (step === "loading") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
        <Loader2 className="h-4 w-4 text-primary animate-spin" strokeWidth={2} />
        <p className="text-[13px] text-text-muted">Confirmando reserva...</p>
      </div>
    );
  }

  return (
    <Button
      variant={isOverride ? "outline" : "default"}
      onClick={() => setStep("confirming")}
      className="gap-2"
    >
      {isOverride ? (
        <>
          <ShieldAlert className="h-4 w-4" strokeWidth={2} />
          Aprovar Manualmente
        </>
      ) : (
        <>
          <ShieldCheck className="h-4 w-4" strokeWidth={2} />
          Confirmar e Aprovar
        </>
      )}
    </Button>
  );
}
