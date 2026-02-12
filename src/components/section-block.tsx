"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { SurfaceCard } from "./surface-card";
import { SectionTitle } from "./typography";

interface SectionBlockProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

/**
 * SectionBlock — Collapsible section with nested card
 * Used in reservation detail for Finance, Documents, People, AI Logs
 */
export function SectionBlock({
  title,
  icon,
  children,
  defaultOpen = true,
  className,
}: SectionBlockProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("space-y-3", className)}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 text-left group"
      >
        {icon && (
          <span className="text-text-muted">{icon}</span>
        )}
        <SectionTitle className="flex-1">{title}</SectionTitle>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-text-muted transition-transform duration-200",
            !open && "-rotate-90"
          )}
          strokeWidth={1.75}
        />
      </button>
      {open && (
        <SurfaceCard elevation={2} className="animate-in fade-in-0 slide-in-from-top-1 duration-200">
          {children}
        </SurfaceCard>
      )}
    </div>
  );
}
