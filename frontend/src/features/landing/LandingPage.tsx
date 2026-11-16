import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FlaskConical,
  Languages,
  Layers,
  Leaf,
  NotebookPen,
  ScanLine,
  Sprout,
} from "lucide-react";
import { apiFetch } from "@/api/client";
import { useDiseases } from "@/features/diseases/hooks";
import { DiseaseCard } from "@/features/diseases/components/DiseaseCard";
import { useJournal } from "@/features/journal/useJournal";
import { isDue } from "@/features/journal/store";
import { Skeleton } from "@/components/ui/Skeleton";
import hero from "@/assets/images/anatomy/hero-sunflower-bloom.jpg";
import leaves from "@/assets/images/anatomy/leaves.jpg";
import stems from "@/assets/images/anatomy/stems.jpg";
import heads from "@/assets/images/anatomy/heads.jpg";
import roots from "@/assets/images/anatomy/roots.jpg";

interface SystemStats {
  published_diseases: number;
  total_symptoms: number;
}
const anatomy = [
  { code: "leaf", key: "leaves", image: leaves },
  { code: "stem", key: "stems", image: stems },
  { code: "head", key: "heads", image: heads },
  { code: "root", key: "roots", image: roots },
];

export function LandingPage() {
  const { t } = useTranslation();
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["system-stats"],
    queryFn: () => apiFetch<SystemStats>("/public/stats"),
    staleTime: 60_000,
    retry: 1,
  });
  const diseases = useDiseases({ page: 1, size: 3, published: true });
  const journal = useJournal();
  const due = journal.entries.filter((entry) => isDue(entry)).length;
  const latest = [...journal.entries].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  return (
    <div className="studio-page studio-home">
      <div className="studio-welcome">
        <span className="studio-eyebrow">
          <span className="studio-status-dot" />
          {t("studio.eyebrow")}
        </span>
        <Link to="/about">
          {t("studio.about")}
          <ArrowUpRight size={14} />
        </Link>
      </div>
      <section className="studio-hero" aria-labelledby="studio-hero-title">
        <div className="studio-hero-copy">
          <span className="studio-hero-label">
            <Sprout size={15} />
            {t("studio.hero_label")}
          </span>
          <h1 id="studio-hero-title">
            {t("studio.headline")} <em>{t("studio.headline_accent")}</em>
          </h1>
          <p>{t("studio.description")}</p>
          <div className="studio-hero-actions">
            <Link to="/check" className="studio-primary-cta">
              <ScanLine size={18} />
              {t("studio.start")}
              <ArrowRight size={17} />
            </Link>
            <Link to="/diseases" className="studio-hero-secondary">
              {t("studio.explore")}
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="studio-hero-trust">
            <span>
              <CheckCircle2 size={14} />
              {t("studio.evidence")}
            </span>
            <span>
              <Languages size={14} />
              English / ខ្មែរ
            </span>
          </div>
        </div>
        <div className="studio-hero-image">
          <img src={hero} alt={t("studio.hero_alt")} fetchPriority="high" />
          <div className="studio-image-caption">
            <span className="studio-caption-icon">
              <Leaf size={21} />
            </span>
            <div>
              <strong>Helianthus annuus</strong>
              <span>{t("studio.image_caption")}</span>
            </div>
            <span className="studio-image-number">01 / 04</span>
          </div>
          <span className="studio-photo-tag">{t("studio.photo_tag")}</span>
        </div>
      </section>

      <div className="studio-proof-strip">
        <div>
          <BookOpen size={19} />
          <strong>{statsLoading ? "…" : (stats?.published_diseases ?? "—")}</strong>
          <span>{t("studio.disease_count")}</span>
        </div>
        <div>
          <FlaskConical size={19} />
          <strong>{statsLoading ? "…" : (stats?.total_symptoms ?? "—")}</strong>
          <span>{t("studio.symptom_count")}</span>
        </div>
        <div>
          <NotebookPen size={19} />
          <span>{t("studio.journal_ready")}</span>
          <span className="studio-new-tag">{t("studio.new")}</span>
        </div>
        <a href="#plant-parts">
          {t("studio.discover")}
          <ArrowDown size={15} />
        </a>
      </div>

      <section className="studio-tools" aria-label={t("studio.tools")}>
        {[
          { to: "/check", icon: ScanLine, key: "diagnose", n: "01", tone: "green" },
          { to: "/diseases/compare", icon: Layers, key: "compare", n: "02", tone: "gold" },
          { to: "/journal", icon: NotebookPen, key: "journal", n: "03", tone: "clay" },
        ].map(({ to, icon: Icon, key, n, tone }) => (
          <Link key={key} to={to} className={`studio-tool studio-tool-${tone}`}>
            <div className="studio-tool-top">
              <span className="studio-tile-icon">
                <Icon size={23} />
              </span>
              <span>
                {n}
                <ArrowUpRight size={17} />
              </span>
            </div>
            <h2>{t(`studio.${key}_title`)}</h2>
            <p>{t(`studio.${key}_desc`)}</p>
            <span className="studio-tool-link">
              {t(`studio.${key}_action`)}
              <ArrowRight size={15} />
            </span>
          </Link>
        ))}
      </section>

      <section id="plant-parts" className="studio-anatomy">
        <div className="studio-section-heading">
          <div>
            <span className="studio-eyebrow">{t("studio.anatomy_eyebrow")}</span>
            <h2>{t("studio.anatomy_title")}</h2>
            <p>{t("studio.anatomy_desc")}</p>
          </div>
          <span className="studio-section-index">01 — 04</span>
        </div>
        <div className="studio-anatomy-grid">
          {anatomy.map((part, index) => (
            <Link
              to={`/check?category=${part.code}`}
              className="studio-anatomy-card"
              key={part.code}
            >
              <div className="studio-anatomy-image">
                <img src={part.image} alt="" loading="lazy" />
                <span>0{index + 1}</span>
                <span className="studio-anatomy-arrow">
                  <ArrowUpRight size={20} />
                </span>
              </div>
              <h3>{t(`studio.${part.key}`)}</h3>
              <p>{t(`studio.${part.key}_desc`)}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="studio-journal-preview">
        <div className="studio-journal-intro">
          <span className="studio-eyebrow">
            <NotebookPen size={14} />
            {t("studio.your_workspace")}
          </span>
          <h2>{t("studio.progress_title")}</h2>
          <p>{t("studio.progress_desc")}</p>
          <Link to="/journal" className="sf-btn sf-btn--primary">
            {t("studio.open_journal")}
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="studio-journal-summary">
          <div className="studio-summary-top">
            <span>
              <CalendarDays size={18} />
              {t("studio.follow_ups")}
            </span>
            <Link to="/journal?filter=due">
              {t("studio.view_all")}
              <ArrowUpRight size={14} />
            </Link>
          </div>
          {journal.storageError ? (
            <p>{t("journal.storage_error")}</p>
          ) : (
            <>
              <div className="studio-summary-count">
                <strong>{journal.isLoading ? "—" : due.toString().padStart(2, "0")}</strong>
                <span>{t("studio.due_check")}</span>
              </div>
              <div className="studio-summary-note">
                <span className="studio-status-dot" />
                <div>
                  <strong>{latest?.field ?? t("studio.first_note")}</strong>
                  <p>{latest?.notes ?? t("studio.first_note_desc")}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="studio-library">
        <div className="studio-section-heading">
          <div>
            <span className="studio-eyebrow">{t("studio.library_eyebrow")}</span>
            <h2>{t("studio.library_title")}</h2>
          </div>
          <Link to="/diseases" className="studio-text-link">
            {t("studio.all_diseases")}
            <ArrowRight size={16} />
          </Link>
        </div>
        {diseases.isLoading ? (
          <div className="studio-library-grid">
            {[1, 2, 3].map((n) => (
              <Skeleton key={n} height="18rem" className="rounded-2xl" />
            ))}
          </div>
        ) : diseases.isError ? (
          <div className="studio-library-unavailable">
            <BookOpen size={26} />
            <p>{t("studio.library_unavailable")}</p>
            <button
              className="sf-btn sf-btn--secondary sf-btn--sm"
              onClick={() => void diseases.refetch()}
            >
              {t("common.retry")}
            </button>
          </div>
        ) : diseases.data?.items.length ? (
          <div className="studio-library-grid">
            {diseases.data.items.map((disease) => (
              <DiseaseCard key={disease.id} disease={disease} />
            ))}
          </div>
        ) : (
          <p className="studio-library-unavailable">{t("studio.library_empty")}</p>
        )}
      </section>
      <div className="studio-closing">
        <span>
          <Sprout size={20} />
          {t("studio.closing")}
        </span>
        <Link to="/check">
          {t("studio.start")}
          <ArrowUpRight size={17} />
        </Link>
      </div>
    </div>
  );
}
