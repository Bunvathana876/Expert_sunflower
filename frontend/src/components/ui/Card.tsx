import type React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export function Card({
  className,
  hoverable = false,
  children,
  ...props
}: CardProps): React.JSX.Element {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text)] shadow-xs transition-all duration-200",
        hoverable &&
          "hover:-translate-y-0.5 hover:shadow-md hover:border-[var(--color-secondary)]/50",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 p-5 sm:p-6", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>): React.JSX.Element {
  return (
    <h3
      className={cn(
        "text-lg font-bold tracking-tight text-[var(--color-text)] leading-snug",
        className,
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>): React.JSX.Element {
  return (
    <p
      className={cn(
        "text-xs sm:text-sm text-[var(--color-text-muted)] leading-relaxed",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div className={cn("p-5 sm:p-6 pt-0", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex items-center p-5 sm:p-6 pt-0 border-t border-[var(--color-border-subtle)] mt-4",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
