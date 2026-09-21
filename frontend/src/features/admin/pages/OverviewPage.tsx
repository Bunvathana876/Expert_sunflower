import type React from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useAnalyticsOverview } from "../hooks";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";

export function OverviewPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useAnalyticsOverview();

  if (isLoading) {
    return (
      <div aria-busy="true">
        <Skeleton height="2rem" width="30%" className="mb-4" />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height="6rem" className="rounded-lg" />
          ))}
        </div>
        <Skeleton height="15rem" className="rounded-lg mb-6" />
        <Skeleton height="12rem" className="rounded-lg" />
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  const maxTrend = Math.max(...data.checks_trend_30d.map((d) => d.count), 1);

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 className="sf-section-title">{t("admin.overview_title")}</h1>
        <p className="sf-section-subtitle">{t("admin.overview_subtitle")}</p>
      </div>

      {/* KPI Cards */}
      <div
        className="sf-admin-stats-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div className="sf-card" style={{ padding: "1.25rem" }}>
          <span
            style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", fontWeight: 600 }}
          >
            {t("admin.stat_checks_today")}
          </span>
          <div
            style={{
              fontSize: "2rem",
              fontWeight: 800,
              color: "var(--color-primary)",
              marginTop: "0.25rem",
            }}
          >
            {data.checks_today}
          </div>
        </div>

        <div className="sf-card" style={{ padding: "1.25rem" }}>
          <span
            style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", fontWeight: 600 }}
          >
            {t("admin.stat_checks_total")}
          </span>
          <div
            style={{
              fontSize: "2rem",
              fontWeight: 800,
              color: "var(--color-text)",
              marginTop: "0.25rem",
            }}
          >
            {data.checks_total}
          </div>
        </div>

        <div className="sf-card" style={{ padding: "1.25rem" }}>
          <span
            style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", fontWeight: 600 }}
          >
            {t("admin.stat_no_match_patterns")}
          </span>
          <div
            style={{
              fontSize: "2rem",
              fontWeight: 800,
              color: "hsl(38 90% 48%)",
              marginTop: "0.25rem",
            }}
          >
            {data.no_match_patterns.length}
          </div>
        </div>

        <div className="sf-card" style={{ padding: "1.25rem" }}>
          <span
            style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", fontWeight: 600 }}
          >
            {t("admin.stat_pending_feedback")}
          </span>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <div
              style={{
                fontSize: "2rem",
                fontWeight: 800,
                color: data.pending_feedback_count > 0 ? "hsl(4 80% 52%)" : "var(--color-text)",
                marginTop: "0.25rem",
              }}
            >
              {data.pending_feedback_count}
            </div>
            {data.pending_feedback_count > 0 && (
              <Link
                to="/admin/feedback"
                className="sf-btn sf-btn--ghost sf-btn--sm"
                style={{ textDecoration: "none" }}
              >
                {t("admin.view_queue")} →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 30-Day Activity Chart */}
      <section className="sf-card" style={{ padding: "1.25rem", marginBottom: "2rem" }}>
        <h2
          style={{
            fontSize: "1rem",
            fontWeight: 700,
            margin: "0 0 1rem",
            color: "var(--color-text)",
          }}
        >
          {t("admin.chart_activity_title")}
        </h2>
        {data.checks_trend_30d.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", margin: 0 }}>
            {t("admin.no_activity_yet")}
          </p>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "0.25rem",
              height: "8rem",
              paddingBottom: "1.5rem",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            {data.checks_trend_30d.map((d) => {
              const barHeight = Math.max((d.count / maxTrend) * 100, 4);
              return (
                <div
                  key={d.date}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    height: "100%",
                    justifyContent: "flex-end",
                  }}
                  title={`${d.date}: ${d.count} checks`}
                >
                  <div
                    style={{
                      width: "100%",
                      maxWidth: "1.25rem",
                      height: `${barHeight}%`,
                      backgroundColor: "var(--color-primary)",
                      borderRadius: "2px 2px 0 0",
                      transition: "height 0.3s ease",
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Two Column Section: Top Symptoms & No-Match Patterns */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {/* Top Reported Symptoms */}
        <section className="sf-card" style={{ padding: "1.25rem" }}>
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 700,
              margin: "0 0 1rem",
              color: "var(--color-text)",
            }}
          >
            🍃 {t("admin.top_symptoms_title")}
          </h2>
          {data.top_symptoms.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", margin: 0 }}>
              {t("admin.no_symptoms_recorded")}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {data.top_symptoms.map((s) => (
                <div
                  key={s.symptom_id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.5rem 0.75rem",
                    background: "var(--color-surface-raised)",
                    borderRadius: "var(--radius-md)",
                    fontSize: "0.875rem",
                  }}
                >
                  <span style={{ fontWeight: 500, color: "var(--color-text)" }}>{s.label}</span>
                  <span className="sf-candidate__rank">{s.count}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Unmatched Symptom Patterns */}
        <section className="sf-card" style={{ padding: "1.25rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: "0.5rem",
            }}
          >
            <h2
              style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--color-text)" }}
            >
              ❓ {t("admin.no_match_patterns_title")}
            </h2>
          </div>
          <p
            style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", margin: "0 0 1rem" }}
          >
            {t("admin.no_match_patterns_help")}
          </p>

          {data.no_match_patterns.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", margin: 0 }}>
              {t("admin.no_unmatched_patterns")}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {data.no_match_patterns.map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "0.75rem",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--color-surface)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        color: "var(--color-primary)",
                      }}
                    >
                      Pattern #{idx + 1}
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {t("admin.pattern_frequency", { count: p.count })}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                    {p.symptoms.map((sym) => (
                      <span
                        key={sym}
                        className="sf-badge"
                        style={{ fontSize: "0.6875rem", background: "var(--color-surface-raised)" }}
                      >
                        {sym}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
