import type React from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { getDiseaseImage } from "../utils/diseaseImages";
import type { DiseaseListItem } from "@/types/api";

interface DiseaseCardProps {
  disease: DiseaseListItem;
}

/**
 * Modern Botanical Card component for the disease catalog grid.
 * Displays disease image (with fallback), name, pathogen type badge, and description.
 */
export function DiseaseCard({ disease }: DiseaseCardProps): React.JSX.Element {
  const { i18n } = useTranslation();
  const isKhmer = i18n.language === "km";
  const imageUrl = getDiseaseImage(disease.slug, disease.image_url);

  return (
    <Link
      to={`/diseases/${disease.slug}`}
      className="group flex flex-col rounded-2xl overflow-hidden text-decoration-none transition-all duration-200 hover:-translate-y-1 hover:shadow-md border border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-secondary)]/50"
    >
      {/* Image Banner */}
      <div className="relative w-full aspect-[16/10] overflow-hidden bg-[var(--color-surface-raised)]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={disease.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-103"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[var(--color-text-muted)] gap-1.5 p-4">
            <span className="text-3xl" aria-hidden="true">
              🌻
            </span>
            <span className="text-[0.65rem] uppercase tracking-wider font-semibold">
              {isKhmer ? "ជំងឺផ្កាឈូករ័ត្ន" : "Sunflower Pathogen"}
            </span>
          </div>
        )}

        {/* Pathogen Floating Badge */}
        <div className="absolute top-2.5 right-2.5 shadow-2xs">
          <Badge variant={disease.pathogen_type}>
            {disease.pathogen_type}
          </Badge>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 min-w-0">
        <div className="space-y-1.5 min-w-0">
          <h3 className="text-base font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors line-clamp-2 break-words leading-snug">
            {disease.name}
          </h3>

          {disease.description && (
            <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed break-words">
              {disease.description}
            </p>
          )}
        </div>

        <div className="pt-2.5 border-t border-[var(--color-border-subtle)] flex items-center justify-between text-xs font-semibold text-[var(--color-primary)] dark:text-[var(--color-secondary)]">
          <span>{isKhmer ? "ពិនិត្យការណែនាំព្យាបាល" : "View Clinical Guide"}</span>
          <ArrowRight
            size={14}
            className="transition-transform duration-200 group-hover:translate-x-1"
          />
        </div>
      </div>
    </Link>
  );
}
