import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSymptomsGrouped } from "@/features/diagnosis/hooks";
import { useCreateSymptom, useUpdateSymptom, useDeleteSymptom } from "../hooks";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { SymptomItem } from "@/types/api";

interface ExtendedSymptom extends SymptomItem {
  category_id: number;
  category_label: string;
}

export function SymptomsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { data: grouped, isLoading, isError, refetch } = useSymptomsGrouped();

  const createMutation = useCreateSymptom();
  const updateMutation = useUpdateSymptom();
  const deleteMutation = useDeleteSymptom();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // Edit / Create state
  const [editingSymptom, setEditingSymptom] = useState<ExtendedSymptom | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formCode, setFormCode] = useState("");
  const [formLabelEn, setFormLabelEn] = useState("");
  const [formLabelKm, setFormLabelKm] = useState("");
  const [formCategoryId, setFormCategoryId] = useState<number>(1);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete state
  const [symptomToDelete, setSymptomToDelete] = useState<ExtendedSymptom | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Flatten grouped symptoms
  const allSymptoms: ExtendedSymptom[] = (grouped ?? []).flatMap((g) =>
    g.symptoms.map((s) => ({
      ...s,
      category_id: g.category.id,
      category_label: g.category.label,
    })),
  );

  const filtered = allSymptoms.filter((s) => {
    const matchesQuery =
      !search ||
      s.label.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase());
    const matchesCat = !selectedCategory || String(s.category_id) === selectedCategory;
    return matchesQuery && matchesCat;
  });

  // Auto-generate code from label
  const generateCode = (label: string): string => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
  };

  const openCreateModal = () => {
    setFormCode("");
    setFormLabelEn("");
    setFormLabelKm("");
    setFormCategoryId(grouped?.[0]?.category.id ?? 1);
    setFormError(null);
    setIsCreating(true);
  };

  const openEditModal = (s: ExtendedSymptom) => {
    setEditingSymptom(s);
    setFormCode(s.code);
    setFormLabelEn(s.label); // API returns current locale label
    setFormLabelKm(""); // We'll need to fetch translations separately or use detail endpoint
    setFormCategoryId(s.category_id);
    setFormError(null);
  };

  const handleLabelEnChange = (value: string) => {
    setFormLabelEn(value);
    // Auto-generate code only when creating new symptom
    if (isCreating) {
      setFormCode(generateCode(value));
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim() || !formLabelEn.trim()) return;

    setFormError(null);
    try {
      if (isCreating) {
        await createMutation.mutateAsync({
          code: formCode.trim(),
          label_en: formLabelEn.trim(),
          label_km: formLabelKm.trim() || undefined,
          category_id: formCategoryId,
        });
        setIsCreating(false);
      } else if (editingSymptom) {
        await updateMutation.mutateAsync({
          id: editingSymptom.id,
          payload: {
            code: formCode.trim(),
            label_en: formLabelEn.trim(),
            label_km: formLabelKm.trim() || undefined,
            category_id: formCategoryId,
          },
        });
        setEditingSymptom(null);
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const handleDelete = async () => {
    if (!symptomToDelete) return;
    setConflictError(null);
    try {
      await deleteMutation.mutateAsync(symptomToDelete.id);
      setSymptomToDelete(null);
    } catch (err: unknown) {
      // If 409 conflict, surfaces the message listing blocking diseases
      const msg = err instanceof Error ? err.message : t("common.error");
      setConflictError(msg);
    }
  };

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
            {t("admin.symptoms_catalog_title")}
          </h1>
          <p className="sf-section-subtitle" style={{ margin: "0.25rem 0 0" }}>
            {t("admin.symptoms_catalog_subtitle")}
          </p>
        </div>

        <button
          type="button"
          className="sf-btn sf-btn--primary sf-btn--sm"
          onClick={openCreateModal}
        >
          + {t("admin.add_symptom")}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="sf-search-bar">
        <input
          type="search"
          className="sf-search-input"
          placeholder={t("admin.search_symptoms_placeholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="sf-filter-select"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">{t("admin.all_plant_parts")}</option>
          {grouped?.map((g) => (
            <option key={g.category.id} value={String(g.category.id)}>
              {g.category.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div aria-busy="true">
          <Skeleton height="3rem" className="rounded-lg mb-2" />
          <Skeleton height="15rem" className="rounded-lg" />
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <div className="sf-card" style={{ overflowX: "auto" }}>
          <table className="sf-table">
            <thead>
              <tr>
                <th>{t("admin.col_label")}</th>
                <th>{t("admin.col_code")}</th>
                <th>{t("admin.col_category")}</th>
                <th style={{ textAlign: "right" }}>{t("admin.col_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600, color: "var(--color-text)" }}>{s.label}</td>
                  <td>
                    <code>{s.code}</code>
                  </td>
                  <td>
                    <span
                      className="sf-badge"
                      style={{ background: "var(--color-surface-raised)" }}
                    >
                      {s.category_label}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                      <button
                        type="button"
                        className="sf-btn sf-btn--ghost sf-btn--sm"
                        onClick={() => openEditModal(s)}
                      >
                        ✏️ {t("admin.edit")}
                      </button>
                      <button
                        type="button"
                        className="sf-btn sf-btn--ghost sf-btn--sm"
                        style={{ color: "hsl(4 80% 52%)" }}
                        onClick={() => {
                          setConflictError(null);
                          setSymptomToDelete(s);
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {(isCreating || editingSymptom) && (
        <div
          role="dialog"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            padding: "1rem",
          }}
        >
          <form
            onSubmit={(e) => void handleSaveForm(e)}
            className="sf-card"
            style={{ width: "100%", maxWidth: "26rem", padding: "1.5rem" }}
          >
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.125rem", fontWeight: 700 }}>
              {isCreating ? t("admin.add_symptom") : t("admin.edit_symptom")}
            </h3>

            {/* Code field hidden - auto-generated from label */}

            {/* Side-by-side English and Khmer labels */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
              <div className="sf-form__group">
                <label htmlFor="modal-symptom-label-en" className="sf-form__label">
                  🇬🇧 {t("admin.col_label")} (English) *
                </label>
                <input
                  id="modal-symptom-label-en"
                  type="text"
                  required
                  className="sf-form__input"
                  placeholder="e.g. Raised reddish-brown pustules"
                  value={formLabelEn}
                  onChange={(e) => handleLabelEnChange(e.target.value)}
                />
                {isCreating && formCode && (
                  <p style={{ fontSize: "0.75rem", color: "hsl(0 0% 60%)", marginTop: "0.25rem" }}>
                    {t("admin.auto_code")}: <code>{formCode}</code>
                  </p>
                )}
              </div>

              <div className="sf-form__group">
                <label htmlFor="modal-symptom-label-km" className="sf-form__label">
                  🇰🇭 {t("admin.col_label")} (ខ្មែរ)
                </label>
                <input
                  id="modal-symptom-label-km"
                  type="text"
                  className="sf-form__input"
                  placeholder="e.g. ដំបៅពណ៌ត្នោត-ត្នោតលើស្លឹក"
                  value={formLabelKm}
                  onChange={(e) => setFormLabelKm(e.target.value)}
                  lang="km"
                  style={{ fontFamily: "'Noto Sans Khmer', sans-serif" }}
                />
              </div>
            </div>

            <div className="sf-form__group">
              <label htmlFor="modal-symptom-category" className="sf-form__label">
                {t("admin.col_category")} *
              </label>
              <select
                id="modal-symptom-category"
                className="sf-filter-select"
                style={{ width: "100%" }}
                value={formCategoryId}
                onChange={(e) => setFormCategoryId(Number(e.target.value))}
              >
                {grouped?.map((g) => (
                  <option key={g.category.id} value={g.category.id}>
                    {g.category.label}
                  </option>
                ))}
              </select>
            </div>

            {formError && (
              <p style={{ color: "hsl(4 80% 52%)", fontSize: "0.875rem", marginBottom: "1rem" }}>
                {formError}
              </p>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
                marginTop: "1.5rem",
              }}
            >
              <button
                type="button"
                className="sf-btn sf-btn--ghost sf-btn--sm"
                onClick={() => {
                  setIsCreating(false);
                  setEditingSymptom(null);
                }}
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                className="sf-btn sf-btn--primary sf-btn--sm"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {t("common.save")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={symptomToDelete !== null}
        title={t("admin.confirm_delete_symptom_title")}
        message={
          conflictError
            ? `⚠️ Cannot delete: ${conflictError}`
            : t("admin.confirm_delete_symptom_desc", { label: symptomToDelete?.label ?? "" })
        }
        confirmLabel={t("common.delete")}
        isDanger={true}
        isLoading={deleteMutation.isPending}
        onConfirm={() => void handleDelete()}
        onCancel={() => {
          setSymptomToDelete(null);
          setConflictError(null);
        }}
      />
    </div>
  );
}
