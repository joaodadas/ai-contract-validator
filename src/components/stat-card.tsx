"use client";

import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { SurfaceCard } from "./surface-card";
import { TextLabel, MutedText, Metric } from "./typography";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: string;
    positive?: boolean;
  };
  icon?: React.ReactNode;
  href?: string;
  className?: string;
}

/**
 * StatCard — Clickable KPI card with nested elevation
 * Clicking navigates to the relevant page
 */
export function StatCard({
  title,
  value,
  description,
  trend,
  icon,
  href,
  className,
}: StatCardProps) {
  const router = useRouter();

  return (
    <SurfaceCard
      elevation={1}
      className={cn(
        "gap-3 transition-all duration-150",
        href && "cursor-pointer hover:shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08),0px_2px_4px_-1px_rgba(0,0,0,0.08),0px_4px_8px_0px_rgba(0,0,0,0.06)] hover:-translate-y-px",
        className
      )}
      onClick={href ? () => router.push(href) : undefined}
    >
      <div className="flex items-start justify-between">
        <TextLabel>{title}</TextLabel>
        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-subtle text-text-secondary">
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-end gap-2">
        <Metric>{value}</Metric>
        {trend && (
          <span
            className={cn(
              "mb-1 text-[13px] font-medium leading-[18px]",
              trend.positive ? "text-status-success" : "text-status-error"
            )}
          >
            {trend.positive ? "+" : ""}
            {trend.value}
          </span>
        )}
      </div>
      {description && <MutedText>{description}</MutedText>}
    </SurfaceCard>
  );
}
