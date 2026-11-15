import type React from "react";
import type { LucideIcon } from "lucide-react";
import { Leaf, LeafyGreen, Shrub, Flower2, Wheat, Sprout, CloudSun, Search } from "lucide-react";
import type { SymptomCategory } from "@/types/api";

interface CategoryIconConfig {
  icon: LucideIcon;
  colorClass: string;
}

const CATEGORY_ICONS: Record<string, CategoryIconConfig> = {
  leaf: { icon: Leaf, colorClass: "text-[#33855A] dark:text-[#A0D5A5]" },
  leaf_head: { icon: LeafyGreen, colorClass: "text-[#33855A] dark:text-[#A0D5A5]" },
  whole_plant: { icon: Shrub, colorClass: "text-[#33855A] dark:text-[#A0D5A5]" },
  stem: { icon: Shrub, colorClass: "text-[#A97A3A] dark:text-[#EFC77B]" },
  head: { icon: Flower2, colorClass: "text-[#A97A3A] dark:text-[#EFC77B]" },
  root: { icon: Wheat, colorClass: "text-[#A97A3A] dark:text-[#EFC77B]" },
  seedling: { icon: Sprout, colorClass: "text-[#33855A] dark:text-[#A0D5A5]" },
  environment: { icon: CloudSun, colorClass: "text-[#A97A3A] dark:text-[#EFC77B]" },
};

interface CategorySelectorProps {
  categories: SymptomCategory[];
  activeCategoryId: number | null;
  onSelect: (categoryId: number) => void;
  symptomCounts?: Record<number, number>;
}

/** Compact, accessible plant-part choices for the diagnosis workflow. */
export function CategorySelector({
  categories,
  activeCategoryId,
  onSelect,
  symptomCounts,
}: CategorySelectorProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4" role="group">
      {categories.map((category) => {
        const configuration = CATEGORY_ICONS[category.code];
        const Icon = configuration?.icon ?? Search;
        const isActive = activeCategoryId === category.id;
        return (
          <button
            key={category.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelect(category.id)}
            className={isActive
              ? "flex min-h-[100px] flex-col items-start justify-between gap-2 rounded-xl border-2 border-[#72976D] bg-[#EAF1E5] p-3 text-left shadow-sm outline-offset-2 focus-visible:outline-2 focus-visible:outline-[#224D3A] dark:border-[#A7C78B] dark:bg-[#294732]"
              : "flex min-h-[100px] flex-col items-start justify-between gap-2 rounded-xl border border-[#DCE8D9] bg-[#FAFCF9] p-3 text-left transition-colors hover:border-[#98BA8D] hover:bg-[#F1F6ED] outline-offset-2 focus-visible:outline-2 focus-visible:outline-[#224D3A] dark:border-[#45604A] dark:bg-[#203428] dark:hover:bg-[#2A4532]"}
          >
            <span className="flex w-full items-center justify-between gap-2">
              <span className={configuration?.colorClass ?? "text-[#557B60] dark:text-[#B2D5B3]"}>
                <Icon size={24} strokeWidth={1.9} aria-hidden="true" />
              </span>
              {isActive && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#224D3A] text-xs text-white dark:bg-[#A7C78B] dark:text-[#14291B]" aria-hidden="true">✓</span>}
            </span>
            <span className="flex w-full items-end justify-between gap-2">
              <span className="min-w-0 text-xs font-bold leading-5 text-[#294734] dark:text-[#E1EEE0] sm:text-sm">{category.label}</span>
              {symptomCounts && <span className="shrink-0 rounded-md bg-[#E3EDE0] px-1.5 py-0.5 text-[10px] font-semibold text-[#57725B] dark:bg-[#34503A] dark:text-[#D6E6D0]">{symptomCounts[category.id] ?? 0}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
