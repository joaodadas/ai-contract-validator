import { cn } from "@/lib/utils";
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
  className?: string;
}

/**
 * StatCard — KPI metric card with elevation
 * Used in dashboard for key performance indicators
 */
export function StatCard({
  title,
  value,
  description,
  trend,
  icon,
  className,
}: StatCardProps) {
  return (
    <SurfaceCard elevation={1} className={cn("gap-3", className)}>
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
