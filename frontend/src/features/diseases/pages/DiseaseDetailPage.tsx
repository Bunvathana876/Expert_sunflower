import type React from "react";
import { useParams, Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Printer,
  Stethoscope,
  Sparkles,
  ShieldCheck,
  Layers,
  Leaf,
  Info,
} from "lucide-react";
import { useDiseaseDetail } from "../hooks";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";

export function DiseaseDetailPage(): React.JSX.Element {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();

  const { data: disease, isLoading, isError, refetch } = useDiseaseDetail(slug ?? "");

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6" aria-busy="true">
        <Skeleton height="2rem" width="25%" className="rounded-lg" />
        <Skeleton height="20rem" className="rounded-2xl" />
        <Skeleton height="3rem" width="60%" className="rounded-xl" />
        <Skeleton height="8rem" className="rounded-xl" />
        <Skeleton height="12rem" className="rounded-xl" />
      </div>
    );
  }

  if (isError || !disease) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  return (
    <article className="max-w-4xl mx-auto space-y-8">
      {/* Navigation & Action Header */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/diseases"
          className="sf-btn sf-btn--ghost sf-btn--sm flex items-center gap-1.5 text-xs font-semibold"
        >
          <ArrowLeft size={14} />
          <span>{t("diseases.back_to_list")}</span>
        </Link>
        <button
          type="button"
          className="sf-btn sf-btn--secondary sf-btn--sm flex items-center gap-1.5 text-xs font-semibold"
          onClick={() => window.print()}
        >
          <Printer size={14} />
          <span>{t("diseases.print")}</span>
        </button>
      </div>

      {/* Hero Visual Card */}
      <div className="sf-glass-card overflow-hidden border border-slate-200/80 dark:border-slate-800">
        <div className="relative w-full aspect-[21/9] sm:aspect-[2/1] bg-slate-100 dark:bg-stone-800/80 overflow-hidden">
          {disease.image_url ? (
            <img
              src={disease.image_url}
              alt={disease.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
              <span className="text-5xl" aria-hidden="true">
                🌻
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider">
                Clinical Reference Image
              </span>
            </div>
          )}

          {/* Floating pathogen badge */}
          <div className="absolute top-4 right-4 shadow-md">
            <Badge variant={disease.pathogen_type}>{disease.pathogen_type}</Badge>
          </div>
        </div>

        {/* Title Header */}
        <div className="p-6 sm:p-8 space-y-3 bg-white/60 dark:bg-stone-900/70 backdrop-blur-md">
          <div className="space-y-1">
            <div className="text-[0.68rem] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider font-mono">
              Sunflower Pathology Index • {disease.slug}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
              {disease.name}
            </h1>
          </div>

          {disease.description && (
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
              {disease.description}
            </p>
          )}
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="space-y-6">
        {/* Cause / Etiology */}
        {disease.cause && (
          <section className="sf-glass-card p-6 space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Info size={18} className="text-amber-500" />
              <span>{t("diseases.section_cause")}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {disease.cause}
            </p>
          </section>
        )}

        {/* Symptoms Grouped by Plant Part */}
        {disease.symptom_groups && disease.symptom_groups.length > 0 && (
          <section className="sf-glass-card p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Leaf size={18} className="text-green-600" />
              <span>{t("diseases.section_symptoms")}</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {disease.symptom_groups.map((group) => (
                <div
                  key={group.category.id}
                  className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2.5"
                >
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Layers size={14} className="text-amber-500" />
                    <span>{group.category.label}</span>
                  </h3>

                  <ul className="space-y-2">
                    {group.symptoms.map((sym) => (
                      <li
                        key={sym.symptom_id}
                        className="text-xs text-slate-700 dark:text-slate-200 flex items-start gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{sym.label}</span>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {sym.is_required && (
                              <span className="px-1.5 py-0.5 rounded text-[0.65rem] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                                {t("diseases.required_symptom")}
                              </span>
                            )}
                            {sym.is_pathognomonic && (
                              <span className="px-1.5 py-0.5 rounded text-[0.65rem] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                                {t("diseases.pathognomonic_symptom")}
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Treatment & Management */}
        {disease.treatment && (
          <section className="sf-glass-card p-6 space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Stethoscope size={18} className="text-blue-500" />
              <span>{t("diseases.section_treatment")}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {disease.treatment}
            </p>
          </section>
        )}

        {/* Prevention Strategies */}
        {disease.prevention && (
          <section className="sf-glass-card p-6 space-y-3 border-amber-500/20">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck size={18} className="text-green-600" />
              <span>{t("diseases.section_prevention")}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {disease.prevention}
            </p>
          </section>
        )}
      </div>

      {/* Clinical Diagnostic CTA Box */}
      <div className="sf-glass-card p-6 sm:p-8 text-center space-y-3 bg-gradient-to-br from-amber-500/10 via-transparent to-green-500/10 border-amber-500/30">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto text-xl shadow-xs">
          <Stethoscope size={24} />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
            {t("diseases.cta_title")}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {t("diseases.cta_desc")}
          </p>
        </div>
        <div className="pt-2">
          <Link
            to="/check"
            className="sf-btn sf-btn--primary sf-btn--md font-bold inline-flex items-center gap-2"
          >
            <Sparkles size={16} />
            <span>{t("nav.check")}</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
