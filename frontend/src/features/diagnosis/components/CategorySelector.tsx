import type React from "react";
import { useTranslation } from "react-i18next";
import type { SymptomCategory } from "@/types/api";

/** Icons mapped by category code for visual identification */
const CATEGORY_ICONS: Record<string, string> = {
  leaf: "🍃",
  leaf_head: "🌿",
  whole_plant: "🌱",
  stem: "🪵",
  head: "🌻",
  root: "🌾",
  seedling: "🌼",
  environment: "🌤️",
};

interface CategorySelectorProps {
  categories: SymptomCategory[];
  activeCategoryId: number | null;
  onSelect: (categoryId: number) => void;
}

/**
 * Grid of large tap-target cards for selecting a plant part category.
 * Mobile-first: 2-column grid, expands to 4 on wider screens.
 */
export function CategorySelector({
  categories,
  activeCategoryId,
  onSelect,
}: CategorySelectorProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div>
      <h2 className="sf-section-title">{t("checker.select_plant_part")}</h2>
      <div className="sf-category-grid">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`sf-category-card ${activeCategoryId === cat.id ? "sf-category-card--active" : ""}`}
            onClick={() => onSelect(cat.id)}
            aria-pressed={activeCategoryId === cat.id}
          >
            <span className="sf-category-card__icon" aria-hidden="true">
              {CATEGORY_ICONS[cat.code] ?? "🔍"}
            </span>
            <span className="sf-category-card__label">{cat.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
