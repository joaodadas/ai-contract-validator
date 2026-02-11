import { cn } from "@/lib/utils";

interface SurfaceCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Elevation level: 1 = main card, 2 = nested card */
  elevation?: 1 | 2;
  /** Remove default padding */
  noPadding?: boolean;
}

/**
 * SurfaceCard — Refined card component with Apple-inspired elevation
 *
 * Elevation 1: Main content cards with soft shadow
 * Elevation 2: Nested cards inside main cards (subtle inset)
 */
export function SurfaceCard({
  className,
  children,
  elevation = 1,
  noPadding = false,
  ...props
}: SurfaceCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl",
        !noPadding && "p-6",
        elevation === 1 && "bg-surface-elevated",
        elevation === 2 && "bg-surface-subtle",
        className
      )}
      style={{
        boxShadow:
          elevation === 1
            ? "0px 0px 0px 1px rgba(0,0,0,0.06), 0px 1px 2px -1px rgba(0,0,0,0.06), 0px 2px 4px 0px rgba(0,0,0,0.04)"
            : elevation === 2
              ? "0px 0px 0px 1px rgba(0,0,0,0.04), 0px 1px 1px 0px rgba(0,0,0,0.03), 0px 1px 2px 0px rgba(0,0,0,0.02)"
              : undefined,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
