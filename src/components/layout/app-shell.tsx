"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "./sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-surface-base">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        <div
          className={cn(
            "flex flex-1 flex-col transition-all duration-200 ease-in-out",
            collapsed ? "ml-[60px]" : "ml-[220px]"
          )}
        >
          {children}
        </div>
      </div>
    </TooltipProvider>
  );
}
