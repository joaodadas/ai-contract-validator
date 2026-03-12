"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReservationFiltersProps {
  enterprises: string[];
}

const STATUS_OPTIONS = [
  { value: "all", label: "Todos os status" },
  { value: "pending", label: "Pendente IA" },
  { value: "approved", label: "Aprovado IA" },
  { value: "divergent", label: "Divergente" },
  { value: "confirmed", label: "Confirmado" },
];

export function ReservationFilters({ enterprises }: ReservationFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSearch = searchParams.get("search") ?? "";
  const currentStatus = searchParams.get("status") ?? "all";
  const currentEnterprise = searchParams.get("enterprise") ?? "all";
  const currentDateFrom = searchParams.get("dateFrom") ?? "";
  const currentDateTo = searchParams.get("dateTo") ?? "";

  const hasActiveFilters =
    currentSearch ||
    currentStatus !== "all" ||
    currentEnterprise !== "all" ||
    currentDateFrom ||
    currentDateTo;

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value && value !== "all") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  const clearFilters = useCallback(() => {
    startTransition(() => {
      router.push(pathname);
    });
  }, [router, pathname]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" strokeWidth={1.75} />
        <Input
          placeholder="Buscar por ID ou nome do titular..."
          defaultValue={currentSearch}
          onChange={(e) => updateParams({ search: e.target.value })}
          className="pl-9 h-9 text-[13px]"
        />
      </div>

      <Select
        value={currentStatus}
        onValueChange={(value) => updateParams({ status: value })}
      >
        <SelectTrigger className="w-[170px] h-9 text-[13px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentEnterprise}
        onValueChange={(value) => updateParams({ enterprise: value })}
      >
        <SelectTrigger className="w-[200px] h-9 text-[13px]">
          <SelectValue placeholder="Empreendimento" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os empreendimentos</SelectItem>
          {enterprises.map((ent) => (
            <SelectItem key={ent} value={ent}>
              {ent}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Input
          type="date"
          defaultValue={currentDateFrom}
          onChange={(e) => updateParams({ dateFrom: e.target.value })}
          className="w-[140px] h-9 text-[13px]"
        />
        <span className="text-[12px] text-text-muted">até</span>
        <Input
          type="date"
          defaultValue={currentDateTo}
          onChange={(e) => updateParams({ dateTo: e.target.value })}
          className="w-[140px] h-9 text-[13px]"
        />
      </div>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-[12px] text-text-muted hover:text-text-primary gap-1"
        >
          <X className="h-3 w-3" />
          Limpar filtros
        </Button>
      )}

      {isPending && (
        <span className="text-[11px] text-text-muted animate-pulse">
          Filtrando...
        </span>
      )}
    </div>
  );
}
