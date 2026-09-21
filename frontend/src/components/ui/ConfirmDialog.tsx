import type React from "react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  variant?: "danger" | "warning" | "default";
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  isDanger = true,
  variant,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): React.JSX.Element | null {
  const isDangerEffective = variant ? variant === "danger" : isDanger;
  const { t } = useTranslation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(2px)",
        padding: "1rem",
      }}
    >
      <div
        className="sf-card"
        style={{
          width: "100%",
          maxWidth: "26rem",
          padding: "1.5rem",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
        }}
      >
        <h3
          id="confirm-dialog-title"
          style={{
            margin: "0 0 0.5rem",
            fontSize: "1.125rem",
            fontWeight: 700,
            color: isDangerEffective ? "hsl(4 80% 52%)" : "var(--color-text)",
          }}
        >
          {title}
        </h3>
        <p
          style={{
            margin: "0 0 1.5rem",
            fontSize: "0.875rem",
            color: "var(--color-text-muted)",
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <button
            type="button"
            className="sf-btn sf-btn--ghost sf-btn--sm"
            disabled={isLoading}
            onClick={onCancel}
          >
            {cancelLabel ?? t("common.cancel")}
          </button>
          <button
            type="button"
            className={`sf-btn sf-btn--sm ${isDangerEffective ? "sf-btn--primary" : "sf-btn--secondary"}`}
            style={
              isDangerEffective
                ? { backgroundColor: "hsl(4 80% 52%)", borderColor: "hsl(4 80% 52%)" }
                : {}
            }
            disabled={isLoading}
            onClick={onConfirm}
          >
            {isLoading ? t("common.loading") : (confirmLabel ?? t("common.confirm"))}
          </button>
        </div>
      </div>
    </div>
  );
}
