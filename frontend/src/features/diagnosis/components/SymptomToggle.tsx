import type React from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import type { Answer, SymptomItem } from "@/types/api";

interface SymptomToggleProps {
  symptom: SymptomItem;
  currentAnswer: Answer;
  onAnswer: (symptomId: number, answer: Answer) => void;
  categoryLabel?: string;
}

/**
 * Highly accessible and tap-friendly symptom selection row.
 * Comfortably sized (56-68px height) for farmers, field workers, and first-time users.
 * The entire row acts as a touch target with prominent visual feedback.
 */
export function SymptomToggle({
  symptom,
  currentAnswer,
  onAnswer,
  categoryLabel,
}: SymptomToggleProps): React.JSX.Element {
  const { t } = useTranslation();
  const isObserved = currentAnswer === "yes";

  const handleToggle = () => {
    onAnswer(symptom.id, isObserved ? "unknown" : "yes");
  };

  return (
    <div
      role="checkbox"
      aria-checked={isObserved}
      tabIndex={0}
      onClick={handleToggle}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          handleToggle();
        }
      }}
      className={`group min-h-[56px] sm:min-h-[64px] px-4 py-3.5 sm:px-5 sm:py-4 rounded-2xl border-2 transition-all cursor-pointer select-none flex items-center justify-between gap-3 sm:gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#224D3A] dark:focus-visible:ring-[#87A774] ${
        isObserved
          ? "bg-[#EDF5EE] dark:bg-[#14231B] border-[#224D3A] dark:border-[#87A774] text-[#1B3B2B] dark:text-[#EFF5EF] shadow-xs"
          : "bg-white dark:bg-[#192720] border-stone-200/80 dark:border-white/[0.08] hover:border-[#87A774]/60 hover:bg-stone-50/80 dark:hover:bg-[#1E2E24] text-stone-800 dark:text-stone-200 shadow-2xs"
      }`}
    >
      <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
        {/* Prominent checkbox-style indicator (large 26-28px box) */}
        <div
          className={`w-6 h-6 sm:w-7 sm:h-7 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all ${
            isObserved
              ? "bg-[#224D3A] dark:bg-[#87A774] border-[#224D3A] dark:border-[#87A774] text-white dark:text-[#0E1712] shadow-xs scale-105"
              : "border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800/80 group-hover:border-[#87A774]"
          }`}
          aria-hidden="true"
        >
          {isObserved && <Check size={16} strokeWidth={3} className="shrink-0" />}
        </div>

        {/* Symptom Label and optional search category badge */}
        <div className="flex flex-col min-w-0 flex-1">
          {categoryLabel && (
            <span className="text-[0.65rem] sm:text-[0.7rem] font-bold uppercase tracking-wider text-[#607366] dark:text-[#94A79C] mb-0.5">
              {categoryLabel}
            </span>
          )}
          <span className="text-sm sm:text-base font-semibold leading-relaxed break-words">
            {symptom.label}
          </span>
        </div>
      </div>

      {/* Trailing feedback pill */}
      {isObserved ? (
        <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-[#224D3A]/10 dark:bg-[#87A774]/20 text-[#224D3A] dark:text-[#87A774] shrink-0 border border-[#224D3A]/15 dark:border-[#87A774]/30">
          {t("checker.observed")}
        </span>
      ) : (
        <span className="hidden sm:inline-block text-xs font-medium text-stone-400 group-hover:text-[#224D3A] dark:group-hover:text-[#87A774] shrink-0 transition-colors">
          {t("checker.tap_if_observed")}
        </span>
      )}
    </div>
  );
}
