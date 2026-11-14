import type React from "react";
import { useTranslation } from "react-i18next";
import { Check, Plus } from "lucide-react";
import type { Answer, SymptomItem } from "@/types/api";

interface SymptomToggleProps {
  symptom: SymptomItem;
  currentAnswer: Answer;
  onAnswer: (symptomId: number, answer: Answer) => void;
}

/** Large, single-tap symptom selection; keeps existing yes/unknown behavior. */
export function SymptomToggle({ symptom, currentAnswer, onAnswer }: SymptomToggleProps): React.JSX.Element {
  const { t } = useTranslation();
  const isObserved = currentAnswer === "yes";

  return (
    <button
      type="button"
      aria-pressed={isObserved}
      onClick={() => onAnswer(symptom.id, isObserved ? "unknown" : "yes")}
      className={isObserved
        ? "group flex min-h-[72px] w-full items-center justify-between gap-4 rounded-xl border border-[#8EAF84] bg-[#EAF3E7] px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#224D3A] dark:border-[#7FA779] dark:bg-[#294532]"
        : "group flex min-h-[72px] w-full items-center justify-between gap-4 rounded-xl border border-[#E3E9E0] bg-[#FBFCFA] px-4 py-3 text-left transition-colors hover:border-[#A2C19A] hover:bg-[#F2F7F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#224D3A] dark:border-[#405746] dark:bg-[#203329] dark:hover:border-[#779777] dark:hover:bg-[#294331]"}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className={isObserved
          ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#224D3A] text-white dark:bg-[#A4C58F] dark:text-[#102516]"
          : "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-[#B9C9B7] bg-white text-[#73956D] dark:border-[#78947B] dark:bg-[#14271C]"}
          aria-hidden="true"
        >
          {isObserved ? <Check size={18} strokeWidth={2.5} /> : <Plus size={15} strokeWidth={1.8} />}
        </span>
        <span className="min-w-0 break-words text-sm font-medium leading-6 text-[#294533] dark:text-[#E4EEE4]">{symptom.label}</span>
      </span>
      <span className={isObserved
        ? "shrink-0 rounded-full bg-[#D3E6CB] px-3 py-1.5 text-xs font-bold text-[#285638] dark:bg-[#446744] dark:text-[#ECF6E6]"
        : "hidden shrink-0 rounded-full bg-[#EBF1E8] px-3 py-1.5 text-xs font-semibold text-[#66816A] group-hover:bg-[#E1EEDB] dark:bg-[#2E4333] dark:text-[#C3D6C2] sm:inline"}
      >
        {isObserved ? t("checker.observed") : t("checker.mark_observed")}
      </span>
    </button>
  );
}
