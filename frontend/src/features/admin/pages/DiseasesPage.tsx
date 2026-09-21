import type React from "react";
import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useDiseases } from "@/features/diseases/hooks";
import { useUpdateDisease, useDeleteDisease } from "../hooks";
import { useAuth } from "@/features/auth";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { DiseaseListItem } from "@/types/api";

export function DiseasesPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();

  const [search, setSearch] = useState("");
  const [pathogen, setPathogen] = useState("");
  const [publishedFilter, setPublishedFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Selected disease for deletion confirmation
  const [diseaseToDelete, setDiseaseToDelete] = useState<DiseaseListItem | null>(null);

  const { data, isLoading, isError, refetch } = useDiseases({
    q: search || undefined,
    pathogen: pathogen || undefined,
    published: publishedFilter === "" ? undefined : publishedFilter === "true",
    page,
    size: pageSize,
  });

  const updateMutation = useUpdateDisease();
  const deleteMutation = useDeleteDisease();

  const handleTogglePublish = async (disease: DiseaseListItem) => {
    await updateMutation.mutateAsync({
      id: disease.id,
      payload: { is_published: !disease.is_published },
    });
  };

  const handleConfirmDelete = async () => {
    if (!diseaseToDelete) return;
    try {
      await deleteMutation.mutateAsync(diseaseToDelete.id);
      setDiseaseToDelete(null);
    } catch {
      // Error handled by mutation state
    }
  };

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 className="sf-section-title" style={{ margin: 0 }}>
            {t("admin.diseases_title")}
          </h1>
          <p className="sf-section-subtitle" style={{ margin: "0.25rem 0 0" }}>
            {t("admin.diseases_subtitle")}
          </p>
        </div>

        {hasPermission("disease:create") && (
          <Link
            to="/admin/diseases/new"
            className="sf-btn sf-btn--primary sf-btn--sm"
            style={{ textDecoration: "none" }}
          >
            + {t("admin.new_disease")}
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="sf-search-bar">
        <input
          type="search"
          className="sf-search-input"
          placeholder={t("diseases.search_placeholder")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />

        <select
          className="sf-filter-select"
          value={pathogen}
          onChange={(e) => {
            setPathogen(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{t("diseases.all_pathogens")}</option>
          <option value="fungal">{t("diseases.pathogen_fungal")}</option>
          <option value="bacterial">{t("diseases.pathogen_bacterial")}</option>
          <option value="viral">{t("diseases.pathogen_viral")}</option>
          <option value="abiotic">{t("diseases.pathogen_abiotic")}</option>
        </select>

        <select
          className="sf-filter-select"
          value={publishedFilter}
          onChange={(e) => {
            setPublishedFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{t("admin.all_statuses")}</option>
          <option value="true">{t("admin.published_only")}</option>
          <option value="false">{t("admin.draft_only")}</option>
        </select>
      </div>

      {/* Diseases Table */}
      {isLoading ? (
        <div aria-busy="true">
          <Skeleton height="3rem" className="rounded-lg mb-2" />
          <Skeleton height="15rem" className="rounded-lg" />
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data || data.items.length === 0 ? (
        <div className="sf-card" style={{ padding: "3rem", textAlign: "center" }}>
          <p style={{ color: "var(--color-text-muted)", margin: 0 }}>
            {t("diseases.no_results_title")}
          </p>
        </div>
      ) : (
        <div className="sf-card" style={{ overflowX: "auto" }}>
          <table className="sf-table">
            <thead>
              <tr>
                <th>{t("admin.col_name")}</th>
                <th>{t("admin.col_pathogen")}</th>
                <th>{t("admin.col_status")}</th>
                <th style={{ textAlign: "right" }}>{t("admin.col_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((disease) => (
                <tr key={disease.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: "var(--color-text)" }}>
                      {disease.name}
                    </div>
                    <code style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                      {disease.slug}
                    </code>
                  </td>
                  <td>
                    <Badge variant={disease.pathogen_type}>{disease.pathogen_type}</Badge>
                  </td>
                  <td>
                    <span
                      className={`sf-badge ${disease.is_published ? "sf-badge--success" : "sf-badge--warning"}`}
                      style={{ fontSize: "0.75rem" }}
                    >
                      {disease.is_published ? t("admin.status_published") : t("admin.status_draft")}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center" }}>
                      {hasPermission("disease:publish") && (
                        <button
                          type="button"
                          className="sf-btn sf-btn--ghost sf-btn--sm"
                          disabled={updateMutation.isPending}
                          onClick={() => void handleTogglePublish(disease)}
                        >
                          {disease.is_published ? t("admin.unpublish") : t("admin.publish")}
                        </button>
                      )}

                      {hasPermission("disease:update") && (
                        <Link
                          to={`/admin/diseases/${disease.slug}`}
                          className="sf-btn sf-btn--secondary sf-btn--sm"
                          style={{ textDecoration: "none" }}
                        >
                          ✏️ {t("admin.edit")}
                        </Link>
                      )}

                      {hasPermission("disease:delete") && (
                        <button
                          type="button"
                          className="sf-btn sf-btn--ghost sf-btn--sm"
                          style={{ color: "hsl(4 80% 52%)" }}
                          onClick={() => setDiseaseToDelete(disease)}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="sf-pagination" aria-label={t("common.pagination")}>
          <button
            type="button"
            className="sf-pagination__btn"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← {t("common.previous")}
          </button>
          <span className="sf-pagination__info">
            {t("common.page_info", { page, total: totalPages })}
          </span>
          <button
            type="button"
            className="sf-pagination__btn"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            {t("common.next")} →
          </button>
        </nav>
      )}

      {/* Deletion Dialog */}
      <ConfirmDialog
        isOpen={diseaseToDelete !== null}
        title={t("admin.confirm_delete_disease_title")}
        message={t("admin.confirm_delete_disease_desc", { name: diseaseToDelete?.name ?? "" })}
        confirmLabel={t("common.delete")}
        isDanger={true}
        isLoading={deleteMutation.isPending}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDiseaseToDelete(null)}
      />
    </div>
  );
}
