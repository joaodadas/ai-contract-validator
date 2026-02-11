import { cn } from "@/lib/utils";

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

/**
 * PageTitle — Main page heading
 * Tight letter spacing, heavier weight, compact leading
 */
export function PageTitle({ className, children, ...props }: TypographyProps) {
  return (
    <h1
      className={cn(
        "text-[28px] font-semibold leading-[34px] tracking-[-0.02em] text-text-primary",
        className
      )}
      {...props}
    >
      {children}
    </h1>
  );
}

/**
 * SectionTitle — Section heading within a page
 * Medium weight, clean spacing
 */
export function SectionTitle({
  className,
  children,
  ...props
}: TypographyProps) {
  return (
    <h2
      className={cn(
        "text-[17px] font-semibold leading-[22px] tracking-[-0.01em] text-text-primary",
        className
      )}
      {...props}
    >
      {children}
    </h2>
  );
}

/**
 * SectionDescription — Subtitle / description below section titles
 */
export function SectionDescription({
  className,
  children,
  ...props
}: TypographyProps) {
  return (
    <p
      className={cn(
        "text-[14px] font-normal leading-[20px] text-text-secondary",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

/**
 * Text — Body text
 * Slightly looser leading, soft tone
 */
export function Text({ className, children, ...props }: TypographyProps) {
  return (
    <p
      className={cn(
        "text-[15px] font-normal leading-[22px] text-text-secondary",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

/**
 * MutedText — Muted / supplementary text
 * Smaller size, subtle color, light weight
 */
export function MutedText({ className, children, ...props }: TypographyProps) {
  return (
    <p
      className={cn(
        "text-[13px] font-normal leading-[18px] text-text-muted",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

/**
 * Label — Form labels and small headings
 * Smaller size, medium weight
 */
export function TextLabel({ className, children, ...props }: TypographyProps) {
  return (
    <span
      className={cn(
        "text-[13px] font-medium leading-[18px] text-text-secondary",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/**
 * MicroText — Timestamps, metadata, tertiary info
 * Muted color, light weight, smallest size
 */
export function MicroText({ className, children, ...props }: TypographyProps) {
  return (
    <span
      className={cn(
        "text-[11px] font-normal leading-[14px] text-text-muted",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/**
 * Metric — Large numbers for KPIs and stats
 */
export function Metric({ className, children, ...props }: TypographyProps) {
  return (
    <span
      className={cn(
        "text-[32px] font-semibold leading-[38px] tracking-[-0.02em] text-text-primary",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
