import type React from "react";
import { useParams, Link } from "react-router";
import { useTranslation } from "react-i18next";
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
      <div className="sf-detail" aria-busy="true">
        <Skeleton height="2rem" width="30%" className="mb-4" />
        <Skeleton height="18rem" className="rounded-xl mb-6" />
        <Skeleton height="2.5rem" width="60%" className="mb-4" />
        <Skeleton height="1rem" width="100%" className="mb-2" />
        <Skeleton height="1rem" width="95%" className="mb-2" />
        <Skeleton height="1rem" width="80%" className="mb-6" />
        <Skeleton height="2rem" width="40%" className="mb-3" />
        <Skeleton height="6rem" className="rounded-lg" />
      </div>
    );
  }

  if (isError || !disease) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  return (
    <article className="sf-detail">
      {/* Navigation header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <Link
          to="/diseases"
          className="sf-btn sf-btn--ghost sf-btn--sm"
          style={{ textDecoration: "none" }}
        >
          ← {t("diseases.back_to_list")}
        </Link>
        <button
          type="button"
          className="sf-btn sf-btn--secondary sf-btn--sm"
          onClick={() => window.print()}
        >
          🖨️ {t("diseases.print")}
        </button>
      </div>

      {/* Disease Image */}
      {disease.image_url ? (
        <img src={disease.image_url} alt={disease.name} className="sf-detail__image" />
      ) : (
        <div
          className="sf-detail__image"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "4rem",
            color: "var(--color-text-muted)",
          }}
          aria-hidden="true"
        >
          🌻
        </div>
      )}

      {/* Header Info */}
      <div className="sf-detail__header">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            flexWrap: "wrap",
            marginBottom: "0.5rem",
          }}
        >
          <h1 className="sf-detail__title">{disease.name}</h1>
          <Badge variant={disease.pathogen_type}>{disease.pathogen_type}</Badge>
        </div>
      </div>

      {/* Description */}
      {disease.description && (
        <section className="sf-detail__section">
          <h2 className="sf-detail__section-title">{t("diseases.section_description")}</h2>
          <p className="sf-detail__text">{disease.description}</p>
        </section>
      )}

      {/* Cause */}
      {disease.cause && (
        <section className="sf-detail__section">
          <h2 className="sf-detail__section-title">{t("diseases.section_cause")}</h2>
          <p className="sf-detail__text">{disease.cause}</p>
        </section>
      )}

      {/* Symptoms Grouped by Plant Part */}
      {disease.symptom_groups && disease.symptom_groups.length > 0 && (
        <section className="sf-detail__section">
          <h2 className="sf-detail__section-title">{t("diseases.section_symptoms")}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {disease.symptom_groups.map((group) => (
              <div
                key={group.category.id}
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  padding: "1rem",
                }}
              >
                <h3
                  style={{
                    fontSize: "0.9375rem",
                    fontWeight: 700,
                    margin: "0 0 0.75rem",
                    color: "var(--color-text)",
                  }}
                >
                  {group.category.label}
                </h3>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  {group.symptoms.map((sym) => (
                    <li
                      key={sym.symptom_id}
                      style={{ fontSize: "0.875rem", color: "var(--color-text)" }}
                    >
                      <span style={{ fontWeight: 500 }}>{sym.label}</span>
                      <div
                        style={{
                          display: "inline-flex",
                          gap: "0.375rem",
                          marginLeft: "0.5rem",
                          verticalAlign: "middle",
                        }}
                      >
                        {sym.is_required && (
                          <span
                            className="sf-badge sf-badge--warning"
                            style={{ fontSize: "0.6875rem", padding: "0.1rem 0.4rem" }}
                          >
                            {t("diseases.required_symptom")}
                          </span>
                        )}
                        {sym.is_pathognomonic && (
                          <span
                            className="sf-badge sf-badge--error"
                            style={{ fontSize: "0.6875rem", padding: "0.1rem 0.4rem" }}
                          >
                            {t("diseases.pathognomonic_symptom")}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Treatment */}
      {disease.treatment && (
        <section className="sf-detail__section">
          <h2 className="sf-detail__section-title">{t("diseases.section_treatment")}</h2>
          <p className="sf-detail__text">{disease.treatment}</p>
        </section>
      )}

      {/* Prevention */}
      {disease.prevention && (
        <section className="sf-detail__section">
          <h2 className="sf-detail__section-title">{t("diseases.section_prevention")}</h2>
          <p className="sf-detail__text">{disease.prevention}</p>
        </section>
      )}

      {/* Call to Action */}
      <div
        style={{
          marginTop: "2.5rem",
          padding: "1.5rem",
          background: "linear-gradient(135deg, var(--color-primary-subtle), var(--color-surface))",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: "1rem",
        }}
      >
        <h3
          style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "var(--color-text)" }}
        >
          {t("diseases.cta_title")}
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: "0.875rem",
            color: "var(--color-text-muted)",
            maxWidth: "28rem",
          }}
        >
          {t("diseases.cta_desc")}
        </p>
        <Link to="/check" className="sf-btn sf-btn--primary">
          🩺 {t("nav.check")}
        </Link>
      </div>
    </article>
  );
}
