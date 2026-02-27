"use client";

import { useState } from "react";
import { Brain, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/surface-card";
import { Text } from "@/components/typography";

function renderValue(value: unknown, indent: number): React.ReactNode {
  if (typeof value === "string") {
    const isWarning = value.toLowerCase().includes("warning");
    return (
      <span className={isWarning ? "text-status-warning font-medium" : "text-status-info"}>
        &quot;{value}&quot;
      </span>
    );
  }
  if (typeof value === "number")
    return <span className="text-status-success">{value}</span>;
  if (typeof value === "boolean")
    return <span className="text-status-warning">{String(value)}</span>;
  if (value === null) return <span className="text-text-muted">null</span>;
  if (Array.isArray(value)) {
    return (
      <span>
        [
        {value.map((item, i) => (
          <span key={i}>
            {"\n" + " ".repeat(indent + 2)}
            {renderValue(item, indent + 2)}
            {i < value.length - 1 && ","}
          </span>
        ))}
        {"\n" + " ".repeat(indent)}]
      </span>
    );
  }
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value);
    return (
      <span>
        {"{"}
        {entries.map(([key, val], i) => (
          <span key={key}>
            {"\n" + " ".repeat(indent + 2)}
            <span className="text-text-secondary">&quot;{key}&quot;</span>
            <span className="text-text-muted">: </span>
            {renderValue(val, indent + 2)}
            {i < entries.length - 1 && ","}
          </span>
        ))}
        {"\n" + " ".repeat(indent)}
        {"}"}
      </span>
    );
  }
  return <span>{String(value)}</span>;
}

export function JsonViewer({ data }: { data: unknown }) {
  const [open, setOpen] = useState(false);

  return (
    <SurfaceCard elevation={1}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-text-muted" strokeWidth={1.75} />
          <Text className="font-semibold text-text-primary">Payload de Auditoria</Text>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-[12px] font-medium text-text-muted"
          onClick={() => setOpen(!open)}
        >
          <span className="text-primary">{open ? "Recolher" : "Expandir"}</span> JSON
          <ChevronDown
            className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
            strokeWidth={2}
          />
        </Button>
      </div>
      {open && (
        <div className="mt-3 animate-in fade-in-0 slide-in-from-top-1 duration-200">
          <div className="overflow-x-auto rounded-lg bg-surface-inset p-4">
            <pre className="font-mono text-[12px] leading-[20px] text-text-primary">
              {renderValue(data, 0)}
            </pre>
          </div>
        </div>
      )}
    </SurfaceCard>
  );
}
