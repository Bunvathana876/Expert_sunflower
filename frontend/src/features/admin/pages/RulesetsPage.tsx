import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRulesets, useActivateRuleset } from "../hooks";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { RulesetItem } from "@/types/api";

export function RulesetsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { data: rulesetsData, isLoading, isError } = useRulesets();
  const activateMutation = useActivateRuleset();

  const [selectedRuleset, setSelectedRuleset] = useState<RulesetItem | null>(null);
  const [pendingActivateRuleset, setPendingActivateRuleset] = useState<RulesetItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const rulesets = rulesetsData?.items ?? [];
  const activeRuleset = rulesets.find((r) => r.is_active) ?? null;

  // Selected or active ruleset for viewing details
  const currentView = selectedRuleset ?? activeRuleset ?? rulesets[0] ?? null;

  const handleConfirmActivate = async () => {
    if (!pendingActivateRuleset) return;
    setErrorMessage(null);
    try {
      await activateMutation.mutateAsync(pendingActivateRuleset.id);
      setPendingActivateRuleset(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("admin.rulesets_activate_error");
      setErrorMessage(msg);
    }
  };

  return (
    <div className="sf-admin-page">
      <div className="sf-admin-page__header">
        <div>
          <h1 className="sf-admin-page__title">{t("admin.rulesets_title")}</h1>
          <p className="sf-admin-page__desc">{t("admin.rulesets_subtitle")}</p>
        </div>
      </div>

      {errorMessage && (
        <div className="sf-alert sf-alert--danger" style={{ marginBottom: "1.5rem" }} role="alert">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="sf-loading-state" style={{ padding: "3rem", textAlign: "center" }}>
          <span className="sf-spinner" aria-hidden="true" />
          <p style={{ marginTop: "1rem", color: "var(--color-text-muted)" }}>
            {t("common.loading")}
          </p>
        </div>
      ) : isError ? (
        <div className="sf-alert sf-alert--danger" role="alert">
          {t("admin.rulesets_load_error")}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1.5rem",
            alignItems: "start",
          }}
        >
          {/* Ruleset List */}
          <div className="sf-card" style={{ padding: 0, overflow: "hidden" }}>
            <div
              style={{
                padding: "1rem 1.5rem",
                borderBottom: "1px solid var(--color-border)",
                fontWeight: 600,
              }}
            >
              {t("admin.rulesets_version_history")}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="sf-table">
                <thead>
                  <tr>
                    <th>{t("admin.rulesets_col_version")}</th>
                    <th>{t("admin.rulesets_col_algorithm")}</th>
                    <th>{t("admin.rulesets_col_status")}</th>
                    <th style={{ textAlign: "right" }}>{t("admin.rulesets_col_actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rulesets.map((r) => {
                    const isCurrent = currentView?.id === r.id;
                    return (
                      <tr
                        key={r.id}
                        style={{
                          backgroundColor: isCurrent
                            ? "var(--color-primary-50, rgba(34, 197, 94, 0.05))"
                            : undefined,
                          cursor: "pointer",
                        }}
                        onClick={() => setSelectedRuleset(r)}
                      >
                        <td>
                          <span style={{ fontWeight: 600, fontFamily: "monospace" }}>
                            {r.version}
                          </span>
                          {r.published_at && (
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                              {new Date(r.published_at).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: "0.875rem" }}>{r.algorithm}</td>
                        <td>
                          {r.is_active ? (
                            <span className="sf-badge sf-badge--success">
                              {t("admin.rulesets_status_active")}
                            </span>
                          ) : (
                            <span className="sf-badge sf-badge--neutral">
                              {t("admin.rulesets_status_inactive")}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {!r.is_active && (
                            <button
                              type="button"
                              className="sf-btn sf-btn--outline-primary sf-btn--sm"
                              disabled={activateMutation.isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPendingActivateRuleset(r);
                              }}
                            >
                              {t("admin.rulesets_btn_activate")}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ruleset Inspector & Diff */}
          {currentView && (
            <div className="sf-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "1.25rem",
                  borderBottom: "1px solid var(--color-border)",
                  paddingBottom: "1rem",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <h2
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: 700,
                        margin: 0,
                        fontFamily: "monospace",
                      }}
                    >
                      {currentView.version}
                    </h2>
                    {currentView.is_active ? (
                      <span className="sf-badge sf-badge--success">
                        {t("admin.rulesets_status_active")}
                      </span>
                    ) : (
                      <span className="sf-badge sf-badge--neutral">
                        {t("admin.rulesets_status_inactive")}
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      margin: "0.25rem 0 0",
                      fontSize: "0.875rem",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {t("admin.rulesets_algo_label")}: <code>{currentView.algorithm}</code>
                  </p>
                </div>
                {!currentView.is_active && (
                  <button
                    type="button"
                    className="sf-btn sf-btn--primary sf-btn--sm"
                    disabled={activateMutation.isPending}
                    onClick={() => setPendingActivateRuleset(currentView)}
                  >
                    {t("admin.rulesets_btn_activate")}
                  </button>
                )}
              </div>

              <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: "0.75rem" }}>
                {t("admin.rulesets_parameters_title")}
              </h3>

              <div
                style={{
                  display: "grid",
                  gap: "0.75rem",
                }}
              >
                {Object.entries(currentView.params).map(([key, val]) => {
                  const activeVal = activeRuleset?.params[key];
                  const hasChanged =
                    !currentView.is_active &&
                    activeRuleset &&
                    activeVal !== undefined &&
                    activeVal !== val;

                  return (
                    <div
                      key={key}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.75rem 1rem",
                        backgroundColor: hasChanged
                          ? "var(--color-warning-50, rgba(234, 179, 8, 0.1))"
                          : "var(--color-bg-subtle, #f8fafc)",
                        borderRadius: "var(--radius-sm, 6px)",
                        border: hasChanged
                          ? "1px solid var(--color-warning, #eab308)"
                          : "1px solid var(--color-border)",
                      }}
                    >
                      <div>
                        <span
                          style={{ fontFamily: "monospace", fontWeight: 600, fontSize: "0.875rem" }}
                        >
                          {key}
                        </span>
                        {hasChanged && (
                          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                            {t("admin.rulesets_active_val_was")}: <code>{String(activeVal)}</code>
                          </div>
                        )}
                      </div>
                      <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "1rem" }}>
                        {String(val)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {currentView.published_at && (
                <div
                  style={{
                    marginTop: "1.5rem",
                    fontSize: "0.75rem",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {t("admin.rulesets_published_meta", {
                    date: new Date(currentView.published_at).toLocaleString(),
                    author: currentView.published_by ?? t("admin.rulesets_author_system"),
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(pendingActivateRuleset)}
        title={t("admin.rulesets_activate_confirm_title")}
        message={t("admin.rulesets_activate_confirm_message", {
          version: pendingActivateRuleset?.version ?? "",
        })}
        confirmLabel={t("admin.rulesets_btn_activate")}
        cancelLabel={t("common.cancel")}
        variant="warning"
        isLoading={activateMutation.isPending}
        onConfirm={() => void handleConfirmActivate()}
        onCancel={() => setPendingActivateRuleset(null)}
      />
    </div>
  );
}
