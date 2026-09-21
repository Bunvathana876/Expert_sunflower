import type React from "react";
import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Clock, ChevronRight, Stethoscope, LogIn, Calendar } from "lucide-react";
import { useAuth } from "@/features/auth";
import { useHistory } from "../hooks";
import { PercentageVisualization } from "@/components/ui/PercentageVisualization";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";

export function HistoryPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, isError, refetch } = useHistory(page, pageSize);

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 text-center sf-glass-card p-8 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-800 dark:text-amber-400 flex items-center justify-center mx-auto text-2xl">
          🔒
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {t("history.auth_required_title")}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {t("history.auth_required_desc")}
        </p>
        <Link
          to="/login"
          className="sf-btn sf-btn--primary sf-btn--md inline-flex items-center gap-1.5"
        >
          <LogIn size={16} />
          <span>{t("nav.login")}</span>
        </Link>
      </div>
    );
  }

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Clock size={24} className="text-amber-500" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {t("history.title")}
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          {t("history.subtitle")}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height="5rem" className="rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data || data.items.length === 0 ? (
        <div className="sf-glass-card p-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-2xl">
            📋
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {t("history.empty_title")}
          </h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            {t("history.empty_desc")}
          </p>
          <Link to="/check" className="sf-btn sf-btn--primary inline-flex items-center gap-1.5">
            <Stethoscope size={16} />
            <span>{t("nav.check")}</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2.5">
            {data.items.map((session) => {
              const formattedDate = new Date(session.created_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <Link
                  key={session.id}
                  to={`/check/${session.id}`}
                  className="sf-glass-card p-4 flex items-center justify-between gap-3 transition-all hover:translate-y-[-1px] group block"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-amber-800 dark:group-hover:text-amber-400 transition-colors">
                        {session.top_disease
                          ? session.top_disease.name
                          : t("history.no_disease_match")}
                      </span>
                      {session.outcome === "no_match" && (
                        <span className="px-1.5 py-0.5 text-[0.65rem] font-bold rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                          {t("history.no_match")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Calendar size={12} />
                      <span>{formattedDate}</span>
                      <span>•</span>
                      <span>{t("history.symptoms_count", { count: session.symptom_count })}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {session.top_confidence !== null && session.top_confidence > 0 && (
                      <div className="w-24 hidden sm:block">
                        <PercentageVisualization
                          value={session.top_confidence}
                          variant="linear"
                          showLabel={true}
                        />
                      </div>
                    )}
                    <ChevronRight
                      size={18}
                      className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform group-hover:translate-x-0.5"
                    />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200/60 dark:border-slate-800 text-xs">
              <button
                type="button"
                className="sf-btn sf-btn--secondary sf-btn--sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← {t("common.previous")}
              </button>

              <span className="text-slate-500 font-medium">
                {t("common.page_info", { page, total: totalPages })}
              </span>

              <button
                type="button"
                className="sf-btn sf-btn--secondary sf-btn--sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                {t("common.next")} →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
