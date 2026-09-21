import type React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  className?: string;
  message?: string;
  onRetry?: () => void;
}

/**
 * Reusable error state with retry button.
 * Falls back to t("common.error") when no message is provided.
 */
export function ErrorState({ className, message, onRetry }: ErrorStateProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className={cn("sf-state-container", className)} role="alert">
      <div className="sf-state-icon sf-state-icon--error">⚠️</div>
      <p className="sf-state-message">{message ?? t("common.error")}</p>
      {onRetry && (
        <button type="button" className="sf-btn sf-btn--secondary" onClick={onRetry}>
          {t("common.retry")}
        </button>
      )}
    </div>
  );
}
