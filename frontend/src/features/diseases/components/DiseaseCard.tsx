import type React from "react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/Badge";
import type { DiseaseListItem } from "@/types/api";

interface DiseaseCardProps {
  disease: DiseaseListItem;
}

/**
 * Card component for the disease grid.
 * Displays disease image (with fallback), name, pathogen type badge, and description.
 */
export function DiseaseCard({ disease }: DiseaseCardProps): React.JSX.Element {
  return (
    <Link
      to={`/diseases/${disease.slug}`}
      className="sf-card"
      style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column" }}
    >
      {disease.image_url ? (
        <img src={disease.image_url} alt={disease.name} className="sf-card__image" loading="lazy" />
      ) : (
        <div
          className="sf-card__image"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2.5rem",
            color: "var(--color-text-muted)",
          }}
          aria-hidden="true"
        >
          🌻
        </div>
      )}

      <div className="sf-card__body" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.5rem",
            marginBottom: "0.5rem",
          }}
        >
          <h3 className="sf-card__title" style={{ margin: 0 }}>
            {disease.name}
          </h3>
          <Badge variant={disease.pathogen_type}>{disease.pathogen_type}</Badge>
        </div>

        {disease.description && <p className="sf-card__desc">{disease.description}</p>}
      </div>
    </Link>
  );
}
