import type React from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import type { Answer, SymptomItem } from "@/types/api";

interface SymptomToggleProps {
  symptom: SymptomItem;
  currentAnswer: Answer;
  onAnswer: (symptomId: number, answer: Answer) => void;
}

/**
 * Simple binary toggle for symptom observation.
 * User marks symptoms they OBSERVE - not observed symptoms stay unselected.
 */
export function SymptomToggle({
  symptom,
  currentAnswer,
  onAnswer,
}: SymptomToggleProps): React.JSX.Element {
  const { t } = useTranslation();
  
  // Simplified: treat "yes" as observed, everything else as not selected
  const isObserved = currentAnswer === "yes";

  return (
    <div
      className={`p-3 sm:p-3.5 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
        isObserved
          ? "bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/30 shadow-sm"
          : "bg-white/60 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700"
      }`}
      role="group"
      aria-label={symptom.label}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 transition-colors ${
            isObserved
              ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
              : "bg-slate-300 dark:bg-slate-700"
          }`}
          aria-hidden="true"
        />
        <div className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-snug">
          {symptom.label}
        </div>
      </div>

      <div
        className="flex items-center gap-1.5 shrink-0 self-end sm:self-center"
        role="radiogroup"
        aria-label={t("checker.answer_label")}
      >
        {/* Toggle button - click to mark as observed, click again to unmark */}
        <button
          type="button"
          onClick={() => onAnswer(symptom.id, isObserved ? "unknown" : "yes")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all ${
            isObserved
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 hover:text-emerald-700"
          }`}
          aria-pressed={isObserved}
          aria-label={isObserved ? t("checker.mark_clear") : t("checker.mark_observed")}
          title={isObserved ? t("checker.mark_clear") : t("checker.mark_observed")}
        >
          {isObserved ? (
            <>
              <Check size={16} strokeWidth={2.5} />
              <span>{t("checker.observed")}</span>
            </>
          ) : (
            <>
              <span>{t("checker.tap_if_observed")}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

