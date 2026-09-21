import type React from "react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useDiseases } from "../hooks";
import { DiseaseCard } from "../components/DiseaseCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import type { PathogenType } from "@/types/api";

const PATHOGENS: PathogenType[] = ["fungal", "bacterial", "viral", "abiotic"];

export function DiseasesPage(): React.JSX.Element {
  const { t } = useTranslation();
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedPathogen, setSelectedPathogen] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 9;

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
      setPage(1); // reset to page 1 on query change
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isError, refetch } = useDiseases({
    q: debouncedQuery || undefined,
    pathogen: selectedPathogen || undefined,
    page,
    size: pageSize,
    published: true,
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

  const handlePathogenChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPathogen(e.target.value);
    setPage(1);
  };

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 className="sf-section-title">{t("diseases.title")}</h1>
        <p className="sf-section-subtitle">{t("diseases.subtitle")}</p>
      </div>

      {/* Search and Filters */}
      <div className="sf-search-bar" role="search" aria-label={t("diseases.search_label")}>
        <input
          type="search"
          className="sf-search-input"
          placeholder={t("diseases.search_placeholder")}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          aria-label={t("diseases.search_placeholder")}
        />

        <select
          className="sf-filter-select"
          value={selectedPathogen}
          onChange={handlePathogenChange}
          aria-label={t("diseases.filter_pathogen")}
        >
          <option value="">{t("diseases.all_pathogens")}</option>
          {PATHOGENS.map((p) => (
            <option key={p} value={p}>
              {t(`diseases.pathogen_${p}`)}
            </option>
          ))}
        </select>
      </div>

      {/* Content states */}
      {isLoading ? (
        <div className="sf-card-grid" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="sf-card" style={{ padding: "1rem" }}>
              <Skeleton height="10rem" className="rounded-lg mb-3" />
              <Skeleton height="1.25rem" width="60%" className="mb-2" />
              <Skeleton height="0.875rem" width="90%" className="mb-1" />
              <Skeleton height="0.875rem" width="75%" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon="🔍"
          title={t("diseases.no_results_title")}
          description={t("diseases.no_results_desc")}
          action={
            searchInput || selectedPathogen ? (
              <button
                type="button"
                className="sf-btn sf-btn--secondary sf-btn--sm"
                onClick={() => {
                  setSearchInput("");
                  setSelectedPathogen("");
                  setPage(1);
                }}
              >
                {t("diseases.clear_filters")}
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="sf-card-grid">
            {data.items.map((disease) => (
              <DiseaseCard key={disease.id} disease={disease} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="sf-pagination" aria-label={t("common.pagination")}>
              <button
                type="button"
                className="sf-pagination__btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label={t("common.previous")}
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
                aria-label={t("common.next")}
              >
                {t("common.next")} →
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
