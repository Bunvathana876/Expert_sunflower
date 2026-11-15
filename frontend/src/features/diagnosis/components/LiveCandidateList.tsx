import type React from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Stethoscope, Info } from "lucide-react";
import { ConfidenceBar } from "@/components/ui/ConfidenceBar";
import type { DiagnosisResult } from "@/types/api";

interface LiveCandidateListProps {
  results: DiagnosisResult[];
  isLoading?: boolean;
}

/**
 * Live-updating ranked candidate list with botanical styling and confidence indicators.
 * Clearly separates preliminary matches from final expert diagnosis results.
 * Uses aria-live="polite" so screen readers announce updates.
 */
export function LiveCandidateList({
  results,
  isLoading = false,
}: LiveCandidateListProps): React.JSX.Element {
  const { t } = useTranslation();

  if (results.length === 0 && !isLoading) {
    return (
      <div
        className="p-5 rounded-2xl bg-stone-50/70 dark:bg-[#14231B]/40 border border-dashed border-stone-200/80 dark:border-white/[0.08] text-center space-y-1.5"
        aria-live="polite"
      >
        <div className="w-8 h-8 rounded-full bg-[#EDF5EE] dark:bg-[#14231B] text-[#224D3A] dark:text-[#87A774] flex items-center justify-center mx-auto mb-2">
          <Stethoscope size={16} />
        </div>
        <p className="text-xs sm:text-sm text-[#607366] dark:text-[#94A79C] leading-relaxed">
          {t("checker.no_candidates_yet")}
        </p>
      </div>
    );
  }

  return (
    <div
      className="space-y-3"
      aria-live="polite"
      aria-label={t("checker.candidate_list")}
    >
      {/* Visual Disclaimer: Distinguishes live preliminary candidate from final result */}
      <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 text-[0.72rem] text-amber-900 dark:text-amber-200">
        <Info size={14} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <p className="leading-tight">
          {t("checker.live_matches_note")}
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-1 text-xs text-[#607366] dark:text-[#94A79C]">
          <Sparkles size={14} className="animate-spin text-[#87A774]" />
          <span>{t("common.loading")}</span>
        </div>
      )}

      {results.map((result) => (
        <div
          key={result.disease.slug}
          className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-[#192720] border border-stone-200/80 dark:border-white/[0.08] shadow-2xs space-y-2 hover:border-[#87A774]/40 transition-colors"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-xs sm:text-sm text-[#1B3B2B] dark:text-[#EFF5EF] truncate min-w-0 flex-1">
              {result.disease.name}
            </span>
            <span className="text-[0.68rem] font-bold px-2 py-0.5 rounded-full bg-[#EDF5EE] dark:bg-[#14231B] text-[#224D3A] dark:text-[#87A774] border border-[#87A774]/20 shrink-0">
              #{String(result.rank)}
            </span>
          </div>
          <ConfidenceBar value={result.confidence} size="sm" />
        </div>
      ))}
    </div>
  );
}
