import type React from "react";
import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useAdminFeedback, useUpdateFeedbackStatus } from "../hooks";
import { useAuth } from "@/features/auth";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import type { FeedbackStatus } from "@/types/api";

const STATUSES: FeedbackStatus[] = ["open", "in_review", "resolved"];

export function FeedbackPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const { data, isLoading, isError, refetch } = useAdminFeedback(
    statusFilter || undefined,
    page,
    pageSize,
  );

  const updateStatusMutation = useUpdateFeedbackStatus();

  const handleStatusChange = async (feedbackId: number, status: FeedbackStatus) => {
    await updateStatusMutation.mutateAsync({ feedbackId, status });
  };

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1 className="sf-section-title" style={{ margin: 0 }}>
            {t("admin.feedback_queue_title")}
          </h1>
          <p className="sf-section-subtitle" style={{ margin: "0.25rem 0 0" }}>
            {t("admin.feedback_queue_subtitle")}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="sf-search-bar">
        <select
          className="sf-filter-select"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{t("admin.all_statuses")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`admin.feedback_status_${s}`)}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div aria-busy="true">
          <Skeleton height="3rem" className="rounded-lg mb-2" />
          <Skeleton height="15rem" className="rounded-lg" />
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data || data.items.length === 0 ? (
        <div className="sf-card" style={{ padding: "3rem", textAlign: "center" }}>
          <p style={{ color: "var(--color-text-muted)", margin: 0 }}>
            {t("admin.no_feedback_reports")}
          </p>
        </div>
      ) : (
        <div className="sf-card" style={{ overflowX: "auto" }}>
          <table className="sf-table">
            <thead>
              <tr>
                <th>{t("admin.col_subject")}</th>
                <th>{t("admin.col_message")}</th>
                <th>{t("admin.col_session")}</th>
                <th>{t("admin.col_status")}</th>
                <th>{t("admin.col_date")}</th>
                {hasPermission("feedback:resolve") && (
                  <th style={{ textAlign: "right" }}>{t("admin.col_actions")}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: "var(--color-text)" }}>
                      {item.subject}
                    </div>
                    {item.user_name && (
                      <small style={{ color: "var(--color-text-muted)" }}>
                        Grower: {item.user_name}
                      </small>
                    )}
                  </td>
                  <td style={{ maxWidth: "20rem" }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.8125rem",
                        color: "var(--color-text-muted)",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {item.message}
                    </p>
                  </td>
                  <td>
                    {item.diagnosis_session_id ? (
                      <Link
                        to={`/check/${item.diagnosis_session_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="sf-btn sf-btn--ghost sf-btn--sm"
                        style={{ fontSize: "0.75rem", padding: "0.2rem 0.4rem" }}
                      >
                        🩺 {item.diagnosis_session_id.slice(0, 8)}…
                      </Link>
                    ) : (
                      <span style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>
                        —
                      </span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`sf-badge ${
                        item.status === "resolved"
                          ? "sf-badge--success"
                          : item.status === "in_review"
                            ? "sf-badge--warning"
                            : "sf-badge--error"
                      }`}
                      style={{ fontSize: "0.75rem" }}
                    >
                      {t(`admin.feedback_status_${item.status}`)}
                    </span>
                  </td>
                  <td
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--color-text-muted)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {new Date(item.created_at).toLocaleDateString()}
                  </td>
                  {hasPermission("feedback:resolve") && (
                    <td style={{ textAlign: "right" }}>
                      <select
                        className="sf-filter-select"
                        style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                        value={item.status}
                        disabled={updateStatusMutation.isPending}
                        onChange={(e) =>
                          void handleStatusChange(item.id, e.target.value as FeedbackStatus)
                        }
                      >
                        <option value="open">{t("admin.feedback_status_open")}</option>
                        <option value="in_review">{t("admin.feedback_status_in_review")}</option>
                        <option value="resolved">{t("admin.feedback_status_resolved")}</option>
                      </select>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="sf-pagination" aria-label={t("common.pagination")}>
          <button
            type="button"
            className="sf-pagination__btn"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← {t("common.previous")}
          </button>
          <span className="sf-pagination__info">
            {t("common.page_info", { page, total: totalPages })}
          </span>
          <button
            type="button"
            className="sf-pagination__btn"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            {t("common.next")} →
          </button>
        </nav>
      )}
    </div>
  );
}
