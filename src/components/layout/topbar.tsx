"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Search, Bell } from "lucide-react";

interface TopbarProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function Topbar({ title, description, children }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border-subtle bg-surface-elevated/80 px-6 backdrop-blur-xl">
      {/* Left — Page Title */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-[15px] font-semibold leading-[20px] tracking-[-0.01em] text-text-primary">
            {title}
          </h1>
          {description && (
            <p className="text-[12px] leading-[16px] text-text-muted">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Center — Filters / Actions */}
      {children && (
        <div className="flex items-center gap-2">{children}</div>
      )}

      {/* Right — Actions + User */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-text-muted hover:text-text-secondary"
        >
          <Search className="h-4 w-4" strokeWidth={1.75} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-text-muted hover:text-text-secondary"
        >
          <Bell className="h-4 w-4" strokeWidth={1.75} />
        </Button>
        <div className="ml-2 h-5 w-px bg-border-subtle" />
        <div className="ml-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-surface-subtle text-[11px] font-medium text-text-secondary">
              U
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
