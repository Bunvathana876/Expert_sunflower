import type React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  className?: string;
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/**
 * Illustrated empty state with configurable message and optional CTA.
 */
export function EmptyState({
  className,
  icon = "🔍",
  title,
  description,
  action,
}: EmptyStateProps): React.JSX.Element {
  return (
    <div className={cn("sf-state-container", className)}>
      <div className="sf-state-icon">{icon}</div>
      <h3 className="sf-state-title">{title}</h3>
      {description && <p className="sf-state-message">{description}</p>}
      {action && <div className="sf-state-action">{action}</div>}
    </div>
  );
}
