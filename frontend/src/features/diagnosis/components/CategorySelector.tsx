import type React from "react";
import { useTranslation } from "react-i18next";
import type { LucideIcon } from "lucide-react";
import {
  Leaf,
  LeafyGreen,
  Shrub,
  Flower2,
  Wheat,
  Sprout,
  CloudSun,
  Search,
  Check,
} from "lucide-react";
import leavesImg from "@/assets/images/anatomy/leaves.jpg";
import stemsImg from "@/assets/images/anatomy/stems.jpg";
import headsImg from "@/assets/images/anatomy/heads.jpg";
import rootsImg from "@/assets/images/anatomy/roots.jpg";
import heroSunflowerBloom from "@/assets/images/anatomy/hero-sunflower-bloom.jpg";
import { SunflowerIcon } from "@/components/ui/SunflowerIcon";
import type { SymptomCategory } from "@/types/api";

const CATEGORY_IMAGES: Record<string, string> = {
  leaf: leavesImg,
  head: headsImg,
  stem: stemsImg,
  root: rootsImg,
  leaf_head: leavesImg,
  whole_plant: heroSunflowerBloom,
};

interface CategoryIconConfig {
  icon: LucideIcon;
  colorClass: string;
  bgClass: string;
}

const CATEGORY_ICONS: Record<string, CategoryIconConfig> = {
  leaf: {
    icon: Leaf,
    colorClass: "text-[#224D3A] dark:text-[#87A774]",
    bgClass: "bg-[#EDF5EE] dark:bg-[#14231B]",
  },
  leaf_head: {
    icon: LeafyGreen,
    colorClass: "text-[#224D3A] dark:text-[#87A774]",
    bgClass: "bg-[#EDF5EE] dark:bg-[#14231B]",
  },
  whole_plant: {
    icon: Shrub,
    colorClass: "text-[#224D3A] dark:text-[#87A774]",
    bgClass: "bg-[#EDF5EE] dark:bg-[#14231B]",
  },
  stem: {
    icon: Shrub,
    colorClass: "text-[#7A9369] dark:text-[#9EC08D]",
    bgClass: "bg-[#EDF5EE] dark:bg-[#14231B]",
  },
  head: {
    icon: Flower2,
    colorClass: "text-[#E4AD45] dark:text-[#EDB855]",
    bgClass: "bg-[#FDF9EE] dark:bg-[#2A1F0B]",
  },
  root: {
    icon: Wheat,
    colorClass: "text-[#B77A38] dark:text-[#E4AD45]",
    bgClass: "bg-[#FDF6ED] dark:bg-[#261E14]",
  },
  seedling: {
    icon: Sprout,
    colorClass: "text-[#7FB347] dark:text-[#B7E482]",
    bgClass: "bg-[#F3F9EC] dark:bg-[#1A2614]",
  },
  environment: {
    icon: CloudSun,
    colorClass: "text-[#E4AD45] dark:text-[#EDB855]",
    bgClass: "bg-[#FDF9EE] dark:bg-[#2A1F0B]",
  },
};

interface CategorySelectorProps {
  categories: SymptomCategory[];
  activeCategoryId: number | null;
  onSelect: (categoryId: number) => void;
  symptomCounts?: Record<number, number>;
}

/**
 * Image-first botanical selector for plant part categories.
 * Renders thumbnail photography or high-contrast botanical icons with real symptom counts,
 * active green borders, and checkmark indicators.
 * Responsive: 2 cols on mobile, 4 cols on tablet/desktop, 8 cols on wide displays.
 */
export function CategorySelector({
  categories,
  activeCategoryId,
  onSelect,
  symptomCounts,
}: CategorySelectorProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#EDF5EE] dark:bg-[#14231B] border border-[#87A774]/30 flex items-center justify-center p-1 shrink-0 shadow-2xs">
          <SunflowerIcon name="plant-anatomy" size={20} className="w-full h-full object-contain" alt="" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#1B3B2B] dark:text-[#EFF5EF] tracking-tight">
            {t("checker.select_plant_part")}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3 sm:gap-3.5">
        {categories.map((cat) => {
          const isSelected = activeCategoryId === cat.id;
          const imageSrc = CATEGORY_IMAGES[cat.code];
          const iconConfig = CATEGORY_ICONS[cat.code];
          const IconComponent = iconConfig?.icon ?? Search;
          const count = symptomCounts?.[cat.id] ?? 0;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelect(cat.id)}
              aria-pressed={isSelected}
              className={`group relative text-left p-2.5 sm:p-3 rounded-2xl border-2 transition-all cursor-pointer select-none flex flex-col justify-between h-full min-h-[142px] sm:min-h-[152px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#224D3A] dark:focus-visible:ring-[#87A774] ${
                isSelected
                  ? "border-[#224D3A] dark:border-[#87A774] bg-[#EDF5EE]/60 dark:bg-[#14231B] shadow-xs ring-1 ring-[#224D3A]/20"
                  : "border-stone-200/80 dark:border-white/[0.08] bg-white dark:bg-[#192720] hover:border-[#87A774]/50 hover:bg-stone-50/70 dark:hover:bg-[#1E2E24]"
              }`}
            >
              {/* Active Selection Check Badge */}
              {isSelected && (
                <div
                  className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#224D3A] dark:bg-[#87A774] text-white dark:text-[#0E1712] flex items-center justify-center shadow-xs z-10 animate-in fade-in zoom-in duration-150"
                  aria-hidden="true"
                >
                  <Check size={12} strokeWidth={3} />
                </div>
              )}

              {/* Plant Part Thumbnail / Icon */}
              {imageSrc ? (
                <div className="relative h-14 sm:h-16 w-full rounded-xl overflow-hidden mb-2 bg-stone-100 dark:bg-stone-800 shrink-0">
                  <img
                    src={imageSrc}
                    alt=""
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />
                </div>
              ) : (
                <div
                  className={`relative h-14 sm:h-16 w-full rounded-xl flex items-center justify-center mb-2 shrink-0 border border-black/5 dark:border-white/5 ${
                    iconConfig?.bgClass ?? "bg-stone-100 dark:bg-stone-800"
                  } ${iconConfig?.colorClass ?? "text-stone-600 dark:text-stone-300"}`}
                >
                  <IconComponent size={24} strokeWidth={2} />
                </div>
              )}

              {/* Category Label and Symptom Count */}
              <div className="min-w-0 w-full">
                <div className="font-bold text-xs sm:text-sm text-[#1B3B2B] dark:text-[#EFF5EF] leading-tight line-clamp-2 group-hover:text-[#224D3A] dark:group-hover:text-[#87A774] transition-colors break-words">
                  {cat.label}
                </div>
                <div className="text-[0.68rem] sm:text-xs text-[#607366] dark:text-[#94A79C] mt-1 font-medium truncate">
                  {t("checker.symptoms_count", { count })}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
