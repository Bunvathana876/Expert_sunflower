import type React from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  Activity,
  Layers,
  HelpCircle,
  MessageSquare,
  ArrowRight,
  TrendingUp,
  Leaf,
  Calendar,
} from "lucide-react";
import { useAnalyticsOverview } from "../hooks";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";

export function OverviewPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useAnalyticsOverview();

  if (isLoading) {
    return (
      <div aria-busy="true" className="space-y-6">
        <Skeleton height="2rem" width="30%" className="rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height="7rem" className="rounded-xl" />
          ))}
        </div>
        <Skeleton height="15rem" className="rounded-2xl" />
        <Skeleton height="12rem" className="rounded-2xl" />
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  const maxTrend = Math.max(...data.checks_trend_30d.map((d) => d.count), 1);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 size={24} className="text-amber-500" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {t("admin.overview_title")}
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          {t("admin.overview_subtitle")}
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Checks Today */}
        <div className="sf-glass-card p-5 space-y-3 relative overflow-hidden border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t("admin.stat_checks_today")}
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Activity size={18} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 font-mono">
            {data.checks_today}
          </div>
          <div className="flex items-center gap-1 text-[0.7rem] text-amber-600 dark:text-amber-400 font-semibold">
            <TrendingUp size={12} />
            <span>Active monitoring</span>
          </div>
        </div>

        {/* Checks Total */}
        <div className="sf-glass-card p-5 space-y-3 relative overflow-hidden border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t("admin.stat_checks_total")}
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Layers size={18} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 font-mono">
            {data.checks_total}
          </div>
          <div className="text-[0.7rem] text-slate-400">
            Lifetime session diagnostics
          </div>
        </div>

        {/* Unmatched Patterns */}
        <div className="sf-glass-card p-5 space-y-3 relative overflow-hidden border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t("admin.stat_no_match_patterns")}
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <HelpCircle size={18} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
            {data.no_match_patterns.length}
          </div>
          <div className="text-[0.7rem] text-slate-400">
            Unclassified symptom clusters
          </div>
        </div>

        {/* Pending Feedback */}
        <div className="sf-glass-card p-5 space-y-3 relative overflow-hidden border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t("admin.stat_pending_feedback")}
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <MessageSquare size={18} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 font-mono">
              {data.pending_feedback_count}
            </div>
            {data.pending_feedback_count > 0 && (
              <Link
                to="/admin/feedback"
                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                <span>{t("admin.view_queue")}</span>
                <ArrowRight size={12} />
              </Link>
            )}
          </div>
          <div className="text-[0.7rem] text-slate-400">
            Awaiting agronomist review
          </div>
        </div>
      </div>

      {/* 30-Day Activity Chart */}
      <section className="sf-glass-card p-6 space-y-4 border border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Calendar size={16} className="text-amber-500" />
            <span>{t("admin.chart_activity_title")}</span>
          </h2>
          <span className="text-xs text-slate-400">Past 30 Days</span>
        </div>

        {data.checks_trend_30d.length === 0 ? (
          <p className="text-xs text-slate-400 py-8 text-center">{t("admin.no_activity_yet")}</p>
        ) : (
          <div className="pt-4">
            <div className="flex items-end gap-1.5 h-36 border-b border-slate-200 dark:border-slate-700 pb-2">
              {data.checks_trend_30d.map((d) => {
                const barHeight = Math.max((d.count / maxTrend) * 100, 6);
                return (
                  <div
                    key={d.date}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative"
                  >
                    {/* Tooltip on hover */}
                    <div className="absolute -top-8 bg-slate-900 text-white text-[0.65rem] py-0.5 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 font-mono shadow-md">
                      {d.date}: {d.count} checks
                    </div>
                    <div
                      style={{ height: `${barHeight}%` }}
                      className="w-full max-w-[1.25rem] bg-gradient-to-t from-amber-500 to-amber-400 group-hover:from-amber-400 group-hover:to-amber-300 rounded-t-md transition-all duration-300"
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[0.65rem] text-slate-400 pt-2 font-mono">
              <span>{data.checks_trend_30d[0]?.date}</span>
              <span>{data.checks_trend_30d[data.checks_trend_30d.length - 1]?.date}</span>
            </div>
          </div>
        )}
      </section>

      {/* Two Column Section: Top Symptoms & No-Match Patterns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Reported Symptoms */}
        <section className="sf-glass-card p-6 space-y-4 border border-slate-200/80 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Leaf size={16} className="text-amber-500" />
            <span>{t("admin.top_symptoms_title")}</span>
          </h2>

          {data.top_symptoms.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">{t("admin.no_symptoms_recorded")}</p>
          ) : (
            <div className="space-y-2">
              {data.top_symptoms.map((s, idx) => (
                <div
                  key={s.symptom_id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-[0.65rem] font-bold flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {s.label}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full font-mono font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[0.7rem]">
                    {s.count} reports
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Unmatched Symptom Patterns */}
        <section className="sf-glass-card p-6 space-y-4 border border-slate-200/80 dark:border-slate-800">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <HelpCircle size={16} className="text-amber-500" />
              <span>{t("admin.no_match_patterns_title")}</span>
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t("admin.no_match_patterns_help")}
            </p>
          </div>

          {data.no_match_patterns.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">{t("admin.no_unmatched_patterns")}</p>
          ) : (
            <div className="space-y-3">
              {data.no_match_patterns.map((p, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                      Pattern #{idx + 1}
                    </span>
                    <span className="text-[0.7rem] text-slate-400 font-medium">
                      {t("admin.pattern_frequency", { count: p.count })}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {p.symptoms.map((sym) => (
                      <span
                        key={sym}
                        className="px-2 py-0.5 rounded-md text-[0.68rem] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium"
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
