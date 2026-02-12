import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * PageContainer — Consistent max-width content wrapper
 * Centers content with proper padding and max-width
 */
export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn("space-y-6 px-6 py-6", className)}>
      {children}
    </div>
  );
}
