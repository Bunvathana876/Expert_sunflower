import type React from "react";
import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useCreateDisease } from "../hooks";

export function DiseaseCreatePage(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createMutation = useCreateDisease();

  const [slug, setSlug] = useState("");
  const [pathogenType, setPathogenType] = useState("fungal");
  const [isPublished, setIsPublished] = useState(false);
  
  // English content
  const [nameEn, setNameEn] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [causeEn, setCauseEn] = useState("");
  const [treatmentEn, setTreatmentEn] = useState("");
  const [preventionEn, setPreventionEn] = useState("");
  
  // Khmer content
  const [nameKm, setNameKm] = useState("");
  const [descriptionKm, setDescriptionKm] = useState("");
  const [causeKm, setCauseKm] = useState("");
  const [treatmentKm, setTreatmentKm] = useState("");
  const [preventionKm, setPreventionKm] = useState("");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleNameEnChange = (val: string) => {
    setNameEn(val);
    if (!slug) {
      // Auto-generate slug from English name
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, ""),
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim() || !slug.trim()) return;

    setErrorMessage(null);
    try {
      const created = await createMutation.mutateAsync({
        slug: slug.trim(),
        pathogen_type: pathogenType,
        is_published: isPublished,
        name_en: nameEn.trim(),
        description_en: descriptionEn.trim() || undefined,
        cause_en: causeEn.trim() || undefined,
        treatment_en: treatmentEn.trim() || undefined,
        prevention_en: preventionEn.trim() || undefined,
        name_km: nameKm.trim() || undefined,
        description_km: descriptionKm.trim() || undefined,
        cause_km: causeKm.trim() || undefined,
        treatment_km: treatmentKm.trim() || undefined,
        prevention_km: preventionKm.trim() || undefined,
      });

      // Redirect to disease list after creation
      void navigate(`/admin/diseases/${created.slug}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("common.error");
      setErrorMessage(msg);
    }
  };

  // Calculate translation completeness
  const kmFields = [nameKm, descriptionKm, causeKm, treatmentKm, preventionKm];
  const translatedCount = kmFields.filter((f) => !!f.trim()).length;
  const completenessPercent = Math.round((translatedCount / 5) * 100);

  return (
    <div style={{ maxWidth: "64rem", margin: "0 auto", padding: "0 1rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link
          to="/admin/diseases"
          className="sf-btn sf-btn--ghost sf-btn--sm"
          style={{ textDecoration: "none", marginBottom: "0.5rem", display: "inline-block" }}
        >
          ← {t("admin.back_to_diseases")}
        </Link>
        <h1 className="sf-section-title">{t("admin.create_disease_title")}</h1>
        <p className="sf-section-subtitle">{t("admin.create_disease_subtitle")}</p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        
        {/* Basic Info Card */}
        <div className="sf-card" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>
            Basic Information
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
            <div className="sf-form__group">
              <label htmlFor="disease-name-en" className="sf-form__label">
                🇬🇧 {t("admin.disease_name_label")} (English) *
              </label>
              <input
                id="disease-name-en"
                type="text"
                required
                className="sf-form__input"
                value={nameEn}
                onChange={(e) => handleNameEnChange(e.target.value)}
                placeholder="e.g. Alternaria Leaf Spot"
              />
              {slug && (
                <small style={{ color: "var(--color-text-muted)", fontSize: "0.75rem", marginTop: "0.25rem", display: "block" }}>
                  URL: <code>{slug}</code>
                </small>
              )}
            </div>

            <div className="sf-form__group">
              <label htmlFor="disease-name-km" className="sf-form__label">
                🇰🇭 {t("admin.disease_name_label")} (ខ្មែរ)
              </label>
              <input
                id="disease-name-km"
                type="text"
                className="sf-form__input"
                value={nameKm}
                onChange={(e) => setNameKm(e.target.value)}
                placeholder="e.g. ជំងឺស្នាមត្នោតលើស្លឹក"
                lang="km"
                style={{ fontFamily: "'Noto Sans Khmer', sans-serif" }}
              />
            </div>
          </div>

          {/* Slug field hidden - auto-generated from name */}

          <div className="sf-form__group">
            <label htmlFor="pathogen-type" className="sf-form__label">
              {t("diseases.filter_pathogen")} *
            </label>
            <select
              id="pathogen-type"
              className="sf-filter-select"
              style={{ width: "100%" }}
              value={pathogenType}
              onChange={(e) => setPathogenType(e.target.value)}
            >
              <option value="fungal">{t("diseases.pathogen_fungal")}</option>
              <option value="bacterial">{t("diseases.pathogen_bacterial")}</option>
              <option value="viral">{t("diseases.pathogen_viral")}</option>
              <option value="abiotic">{t("diseases.pathogen_abiotic")}</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="sf-form__group" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              id="is-published"
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
            />
            <label htmlFor="is-published" style={{ fontSize: "0.875rem", color: "var(--color-text)" }}>
              {t("admin.publish_immediately")}
            </label>
          </div>
        </div>

        {/* Translation Completeness */}
        <div
          className="sf-card"
          style={{
            padding: "1rem 1.25rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, margin: "0 0 0.25rem" }}>
              {t("admin.translation_completeness")}: {completenessPercent}%
            </h3>
            <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", margin: 0 }}>
              {t("admin.fields_translated_summary", {
                translated: translatedCount,
                total: 5,
              })}
            </p>
          </div>
        </div>

        {/* Content Fields (Bilingual Side-by-Side) */}
        
        {/* Description */}
        <div className="sf-card" style={{ padding: "1.25rem", borderLeft: descriptionKm.trim() ? "4px solid hsl(148 55% 38%)" : "4px solid hsl(38 90% 48%)" }}>
          <div style={{ marginBottom: "0.75rem" }}>
            <h3 style={{ fontSize: "0.875rem", fontWeight: 700, margin: 0 }}>
              Description
            </h3>
            {!descriptionKm.trim() && (
              <span className="sf-badge sf-badge--warning" style={{ fontSize: "0.6875rem", marginLeft: "0.5rem" }}>
                ⚠️ {t("admin.missing_km_translation")}
              </span>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", display: "block", marginBottom: "0.25rem" }}>
                🇬🇧 English
              </label>
              <textarea
                className="sf-form__textarea"
                style={{ minHeight: "5rem" }}
                value={descriptionEn}
                onChange={(e) => setDescriptionEn(e.target.value)}
                placeholder="What does this disease look like?"
              />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", display: "block", marginBottom: "0.25rem" }}>
                🇰🇭 ខ្មែរ
              </label>
              <textarea
                className="sf-form__textarea"
                style={{ minHeight: "5rem", fontFamily: "'Noto Sans Khmer', sans-serif" }}
                value={descriptionKm}
                onChange={(e) => setDescriptionKm(e.target.value)}
                placeholder="ជំងឺនេះមើលទៅដូចម្តេច?"
                lang="km"
              />
            </div>
          </div>
        </div>

        {/* Cause */}
        <div className="sf-card" style={{ padding: "1.25rem", borderLeft: causeKm.trim() ? "4px solid hsl(148 55% 38%)" : "4px solid hsl(38 90% 48%)" }}>
          <div style={{ marginBottom: "0.75rem" }}>
            <h3 style={{ fontSize: "0.875rem", fontWeight: 700, margin: 0 }}>
              Cause
            </h3>
            {!causeKm.trim() && (
              <span className="sf-badge sf-badge--warning" style={{ fontSize: "0.6875rem", marginLeft: "0.5rem" }}>
                ⚠️ {t("admin.missing_km_translation")}
              </span>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", display: "block", marginBottom: "0.25rem" }}>
                🇬🇧 English
              </label>
              <textarea
                className="sf-form__textarea"
                style={{ minHeight: "5rem" }}
                value={causeEn}
                onChange={(e) => setCauseEn(e.target.value)}
                placeholder="What causes this disease? (pathogen, conditions)"
              />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", display: "block", marginBottom: "0.25rem" }}>
                🇰🇭 ខ្មែរ
              </label>
              <textarea
                className="sf-form__textarea"
                style={{ minHeight: "5rem", fontFamily: "'Noto Sans Khmer', sans-serif" }}
                value={causeKm}
                onChange={(e) => setCauseKm(e.target.value)}
                placeholder="អ្វីជាមូលហេតុនៃជំងឺនេះ?"
                lang="km"
              />
            </div>
          </div>
        </div>

        {/* Treatment */}
        <div className="sf-card" style={{ padding: "1.25rem", borderLeft: treatmentKm.trim() ? "4px solid hsl(148 55% 38%)" : "4px solid hsl(38 90% 48%)" }}>
          <div style={{ marginBottom: "0.75rem" }}>
            <h3 style={{ fontSize: "0.875rem", fontWeight: 700, margin: 0 }}>
              Treatment
            </h3>
            {!treatmentKm.trim() && (
              <span className="sf-badge sf-badge--warning" style={{ fontSize: "0.6875rem", marginLeft: "0.5rem" }}>
                ⚠️ {t("admin.missing_km_translation")}
              </span>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", display: "block", marginBottom: "0.25rem" }}>
                🇬🇧 English
              </label>
              <textarea
                className="sf-form__textarea"
                style={{ minHeight: "5rem" }}
                value={treatmentEn}
                onChange={(e) => setTreatmentEn(e.target.value)}
                placeholder="How to treat this disease once infected?"
              />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", display: "block", marginBottom: "0.25rem" }}>
                🇰🇭 ខ្មែរ
              </label>
              <textarea
                className="sf-form__textarea"
                style={{ minHeight: "5rem", fontFamily: "'Noto Sans Khmer', sans-serif" }}
                value={treatmentKm}
                onChange={(e) => setTreatmentKm(e.target.value)}
                placeholder="របៀបព្យាបាលជំងឺនេះ?"
                lang="km"
              />
            </div>
          </div>
        </div>

        {/* Prevention */}
        <div className="sf-card" style={{ padding: "1.25rem", borderLeft: preventionKm.trim() ? "4px solid hsl(148 55% 38%)" : "4px solid hsl(38 90% 48%)" }}>
          <div style={{ marginBottom: "0.75rem" }}>
            <h3 style={{ fontSize: "0.875rem", fontWeight: 700, margin: 0 }}>
              Prevention
            </h3>
            {!preventionKm.trim() && (
              <span className="sf-badge sf-badge--warning" style={{ fontSize: "0.6875rem", marginLeft: "0.5rem" }}>
                ⚠️ {t("admin.missing_km_translation")}
              </span>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", display: "block", marginBottom: "0.25rem" }}>
                🇬🇧 English
              </label>
              <textarea
                className="sf-form__textarea"
                style={{ minHeight: "5rem" }}
                value={preventionEn}
                onChange={(e) => setPreventionEn(e.target.value)}
                placeholder="How to prevent this disease from occurring?"
              />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", display: "block", marginBottom: "0.25rem" }}>
                🇰🇭 ខ្មែរ
              </label>
              <textarea
                className="sf-form__textarea"
                style={{ minHeight: "5rem", fontFamily: "'Noto Sans Khmer', sans-serif" }}
                value={preventionKm}
                onChange={(e) => setPreventionKm(e.target.value)}
                placeholder="របៀបការពារជំងឺនេះ?"
                lang="km"
              />
            </div>
          </div>
        </div>



        {/* Error Message */}
        {errorMessage && (
          <div className="sf-card" style={{ padding: "1rem", backgroundColor: "hsl(4 80% 95%)", borderLeft: "4px solid hsl(4 80% 52%)" }}>
            <p style={{ color: "hsl(4 80% 30%)", fontSize: "0.875rem", margin: 0 }}>
              {errorMessage}
            </p>
          </div>
        )}

        {/* Submit Buttons */}
        <div className="sf-card" style={{ padding: "1.25rem", display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <Link
            to="/admin/diseases"
            className="sf-btn sf-btn--ghost"
            style={{ textDecoration: "none" }}
          >
            {t("common.cancel")}
          </Link>
          <button
            type="submit"
            className="sf-btn sf-btn--primary"
            disabled={createMutation.isPending || !nameEn.trim() || !slug.trim()}
          >
            {createMutation.isPending ? t("common.saving") : t("admin.create_and_continue")}
          </button>
        </div>
      </form>
    </div>
  );
}
