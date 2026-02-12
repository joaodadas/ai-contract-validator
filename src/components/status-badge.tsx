import { cn } from "@/lib/utils";

type StatusVariant = "success" | "warning" | "error" | "info" | "neutral" | "pending";

interface StatusBadgeProps {
  variant: StatusVariant;
  children: React.ReactNode;
  className?: string;
  /** Show a small dot indicator */
  dot?: boolean;
}

const variantStyles: Record<StatusVariant, string> = {
  success: "bg-status-success-bg text-status-success",
  warning: "bg-status-warning-bg text-status-warning",
  error: "bg-status-error-bg text-status-error",
  info: "bg-status-info-bg text-status-info",
  neutral: "bg-surface-subtle text-text-secondary",
  pending: "bg-accent-yellow-soft text-accent-yellow",
};

const dotStyles: Record<StatusVariant, string> = {
  success: "bg-status-success",
  warning: "bg-status-warning",
  error: "bg-status-error",
  info: "bg-status-info",
  neutral: "bg-text-muted",
  pending: "bg-accent-yellow",
};

/**
 * StatusBadge — Refined status indicator
 * Includes "pending" variant with yellow accent
 */
export function StatusBadge({
  variant,
  children,
  className,
  dot = true,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium leading-[16px]",
        variantStyles[variant],
        className
      )}
    >
      {dot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", dotStyles[variant])}
        />
      )}
      {children}
    </span>
  );
}
