import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * PageContainer — Consistent content wrapper
 * Provides uniform spacing and padding for page content
 */
export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn("space-y-6 px-6 py-6", className)}>
      {children}
    </div>
  );
}
