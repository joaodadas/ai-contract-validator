"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav className={cn("flex items-center gap-1", className)}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <div key={i} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight className="h-3 w-3 text-text-muted" strokeWidth={2} />
            )}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-[13px] text-text-muted transition-colors hover:text-text-secondary"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  "text-[13px]",
                  isLast ? "font-medium text-text-primary" : "text-text-muted"
                )}
              >
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
