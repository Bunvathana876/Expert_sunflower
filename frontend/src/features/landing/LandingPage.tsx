import type React from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Stethoscope,
  BookOpen,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Search,
  Cpu,
  FileCheck,
  CheckCircle2,
} from "lucide-react";
import { useDiseases } from "@/features/diseases/hooks";
import { DiseaseCard } from "@/features/diseases/components/DiseaseCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiFetch } from "@/api/client";

interface SystemStats {
  total_diseases: number;
  total_symptoms: number;
  published_diseases: number;
}

async function fetchSystemStats(): Promise<SystemStats> {
  return apiFetch<SystemStats>("/public/stats");
}

export function LandingPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const isKhmer = i18n.language === "km";

  const { data: featuredData, isLoading } = useDiseases({
    page: 1,
    size: 3,
    published: true,
  });

  const { data: stats } = useQuery({
    queryKey: ["system-stats"],
    queryFn: fetchSystemStats,
    staleTime: 60000,
  });

  const plantZones = [
    {
      id: "leaves",
      name: isKhmer ? "ស្លឹក (Leaves)" : "Leaves & Foliage",
      desc: isKhmer ? "អុចស្លឹក, រលួយ, ឡើងម្សៅ, ក្រៀមស្វិត" : "Concentric leaf spots, powdery mildew, chlorosis, wilting",
      icon: "🍃",
    },
    {
      id: "stem",
      name: isKhmer ? "ដើម (Stem & Stalk)" : "Stem & Stalks",
      desc: isKhmer ? "ស្នាមជាំខ្មៅ, ដំបៅដើម, ស្អុយដើម" : "Phoma black stem lesions, cankers, stalk rot",
      icon: "🎋",
    },
    {
      id: "flower_head",
      name: isKhmer ? "ក្បាលផ្កា (Flower Head)" : "Flower Head & Bracts",
      desc: isKhmer ? "ស្អុយក្បាលផ្កា, ផ្សិតពណ៌ស, គ្រាប់មិនពេញ" : "Sclerotinia head rot, gray mold, poor seed fill",
      icon: "🌻",
    },
    {
      id: "roots",
      name: isKhmer ? "ឫស & គល់ (Roots & Collar)" : "Roots & Crown",
      desc: isKhmer ? "រលួយគល់, ក្រិនមិនលូតលាស់, ឫសស្វិត" : "Basal collar rot, stunted vascular flow, seedling blight",
      icon: "🪴",
    },
  ];

  return (
    <div className="space-y-16 sm:space-y-20 py-2 sm:py-6">
      {/* Hero Section — Modern Botanical Science */}
      <section className="relative rounded-3xl p-6 sm:p-14 text-center overflow-hidden border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-xs space-y-8">
        {/* Subtle Decorative Ambient Radial Light */}
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[360px] rounded-full opacity-35 dark:opacity-15 blur-3xl pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(135, 167, 116, 0.25) 0%, rgba(228, 173, 69, 0.12) 60%, transparent 80%)",
          }}
          aria-hidden="true"
        />

        {/* Botanical Platform Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--color-primary-subtle)] border border-[var(--color-secondary)]/35 text-[var(--color-primary)] dark:text-[var(--color-primary)] text-xs font-bold uppercase tracking-wider shadow-2xs">
          <Sparkles size={13} className="text-[var(--color-secondary)]" />
          <span>
            {isKhmer
              ? "Sunflower Studio • ប្រព័ន្ធវិនិច្ឆ័យក្សេត្រសាស្ត្រទំនើប"
              : "Sunflower Studio • Modern Botanical Science"}
          </span>
        </div>

        {/* Hero Title & Subtitle */}
        <div className="space-y-4 max-w-3xl mx-auto">
          <h1 className="text-2xl sm:text-5xl font-extrabold tracking-tight text-[var(--color-text)] leading-[1.18]">
            {t("landing.hero_title")}
          </h1>
          <p className="text-sm sm:text-lg text-[var(--color-text-secondary)] leading-relaxed max-w-2xl mx-auto font-normal">
            {t("landing.hero_subtitle")}
          </p>
        </div>

        {/* Action Buttons with Strong Visual Hierarchy */}
        <div className="flex items-center justify-center gap-3.5 flex-wrap pt-2">
          <Link
            to="/check"
            className="sf-btn sf-btn--primary sf-btn--lg text-sm sm:text-base font-bold flex items-center gap-2.5 shadow-sm hover:shadow-md transition-all group"
          >
            <Stethoscope size={19} className="transition-transform group-hover:rotate-12" />
            <span>{t("landing.start_checking")}</span>
            <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
          </Link>

          <Link
            to="/diseases"
            className="sf-btn sf-btn--secondary sf-btn--lg text-sm sm:text-base font-semibold flex items-center gap-2 transition-all"
          >
            <BookOpen size={18} />
            <span>{t("landing.browse_diseases")}</span>
          </Link>
        </div>

        {/* Live System Telemetry / Metrics */}
        <div className="grid grid-cols-3 max-w-xl mx-auto pt-8 border-t border-[var(--color-border-subtle)] gap-4 sm:gap-6 text-center">
          <div className="space-y-1">
            <div className="text-xl sm:text-3xl font-extrabold font-mono text-[var(--color-primary)] dark:text-[var(--color-text)]">
              {stats?.published_diseases ?? 5}
            </div>
            <div className="text-[0.68rem] sm:text-xs text-[var(--color-text-muted)] uppercase tracking-wider font-bold">
              {isKhmer ? "ជំងឺ & មេរោគ" : "Diseases & Pathogens"}
            </div>
          </div>
          <div className="space-y-1 border-x border-[var(--color-border-subtle)]">
            <div className="text-xl sm:text-3xl font-extrabold font-mono text-[var(--color-primary)] dark:text-[var(--color-text)]">
              {stats?.total_symptoms ?? 20}
            </div>
            <div className="text-[0.68rem] sm:text-xs text-[var(--color-text-muted)] uppercase tracking-wider font-bold">
              {isKhmer ? "សូចនាកររោគសញ្ញា" : "Symptom Indicators"}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xl sm:text-3xl font-extrabold font-mono text-[var(--color-primary)] dark:text-[var(--color-secondary)]">
              8
            </div>
            <div className="text-[0.68rem] sm:text-xs text-[var(--color-text-muted)] uppercase tracking-wider font-bold">
              {isKhmer ? "ផ្នែកដំណាំ" : "Anatomy Zones"}
            </div>
          </div>
        </div>
      </section>

      {/* Plant Anatomy Diagnostic Navigator */}
      <section className="space-y-6">
        <div className="text-center space-y-1.5 max-w-xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text)]">
            {isKhmer ? "ផ្នែកដំណាំដែលត្រូវសង្កេត" : "Observe Plant Anatomy"}
          </h2>
          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
            {isKhmer
              ? "ជ្រើសរើសផ្នែកដំណាំផ្កាឈូករ័ត្នដែលមានសញ្ញាមិនប្រក្រតី ដើម្បីចាប់ផ្តើមវិនិច្ឆ័យ"
              : "Inspect specific sunflower organs to isolate pathogenic fungal, bacterial, and environmental stress"}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plantZones.map((zone) => (
            <Link
              key={zone.id}
              to="/check"
              className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-primary)]/40 hover:-translate-y-1 transition-all group space-y-2.5 block text-decoration-none shadow-2xs"
            >
              <div className="text-2xl" aria-hidden="true">
                {zone.icon}
              </div>
              <h3 className="text-sm font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                {zone.name}
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                {zone.desc}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* How It Works — 3-Step Botanical Diagnostic Journey */}
      <section className="space-y-6">
        <div className="text-center space-y-1.5 max-w-xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text)]">
            {t("landing.how_it_works_title")}
          </h2>
          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
            {t("landing.how_it_works_subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Step 1 */}
          <div className="p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] space-y-4 shadow-2xs hover:border-[var(--color-secondary)]/50 transition-all">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)] flex items-center justify-center font-bold text-base border border-[var(--color-secondary)]/30">
                <Search size={20} />
              </div>
              <span className="text-xs font-mono font-bold text-[var(--color-text-muted)]">
                01
              </span>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-[var(--color-text)]">
                {t("landing.step1_title")}
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                {t("landing.step1_desc")}
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] space-y-4 shadow-2xs hover:border-[var(--color-secondary)]/50 transition-all">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)] flex items-center justify-center font-bold text-base border border-[var(--color-secondary)]/30">
                <Cpu size={20} />
              </div>
              <span className="text-xs font-mono font-bold text-[var(--color-text-muted)]">
                02
              </span>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-[var(--color-text)]">
                {t("landing.step2_title")}
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                {t("landing.step2_desc")}
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] space-y-4 shadow-2xs hover:border-[var(--color-secondary)]/50 transition-all">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)] flex items-center justify-center font-bold text-base border border-[var(--color-secondary)]/30">
                <FileCheck size={20} />
              </div>
              <span className="text-xs font-mono font-bold text-[var(--color-text-muted)]">
                03
              </span>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-[var(--color-text)]">
                {t("landing.step3_title")}
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                {t("landing.step3_desc")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Diseases Reference */}
      <section className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-2xl font-bold text-[var(--color-text)]">
              {t("landing.featured_title")}
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
              {t("landing.featured_subtitle")}
            </p>
          </div>
          <Link
            to="/diseases"
            className="text-xs sm:text-sm font-semibold text-[var(--color-primary)] dark:text-[var(--color-secondary)] hover:underline flex items-center gap-1 shrink-0"
          >
            <span>{t("landing.view_all")}</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5" aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 space-y-3">
                <Skeleton height="9.5rem" className="rounded-xl" />
                <Skeleton height="1.25rem" width="60%" className="rounded-lg" />
                <Skeleton height="0.875rem" width="90%" className="rounded-md" />
              </div>
            ))}
          </div>
        ) : featuredData && featuredData.items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {featuredData.items.map((disease) => (
              <DiseaseCard key={disease.id} disease={disease} />
            ))}
          </div>
        ) : null}
      </section>

      {/* Trust & Field Resilience Banner */}
      <section className="rounded-2xl p-6 sm:p-10 border border-[var(--color-border)] bg-[var(--color-surface-raised)] space-y-4">
        <div className="max-w-2xl mx-auto text-center space-y-2">
          <div className="inline-flex items-center gap-2 text-[var(--color-primary)] dark:text-[var(--color-secondary)] font-bold text-sm">
            <ShieldCheck size={20} />
            <span>{t("landing.trust_title")}</span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">
            {t("landing.trust_desc")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 max-w-3xl mx-auto text-xs text-[var(--color-text-secondary)]">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)]">
            <CheckCircle2 size={16} className="text-[var(--color-secondary)] shrink-0" />
            <span>{isKhmer ? "ដំណើរការលឿនលើទូរស័ព្ទដៃ" : "Fast Mobile Touchflow"}</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)]">
            <CheckCircle2 size={16} className="text-[var(--color-secondary)] shrink-0" />
            <span>{isKhmer ? "អក្សរខ្មែរងាយស្រួលអាន" : "Clear Khmer & English Fonts"}</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)]">
            <CheckCircle2 size={16} className="text-[var(--color-secondary)] shrink-0" />
            <span>{isKhmer ? "ក្បួនវិភាគក្សេត្រសាស្ត្រច្បាស់លាស់" : "Bayesian Pathology Rules"}</span>
          </div>
        </div>
      </section>

      {/* Final Diagnostic Callout Banner */}
      <section className="rounded-3xl p-8 sm:p-12 text-center bg-[var(--color-primary)] text-white space-y-6 shadow-md relative overflow-hidden">
        <div className="max-w-xl mx-auto space-y-2.5 relative z-10">
          <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">
            {isKhmer ? "ត្រៀមខ្លួនពិនិត្យដំណាំរបស់អ្នកហើយឬនៅ?" : "Ready to Diagnose Your Sunflower Field?"}
          </h2>
          <p className="text-xs sm:text-sm text-white/85 leading-relaxed">
            {isKhmer
              ? "ចាប់ផ្តើមការវាយតម្លៃរោគសញ្ញាក្នុងរយៈពេលតិចជាង ២ នាទី និងទទួលបានអនុសាសន៍ព្យាបាលភ្លាមៗ។"
              : "Evaluate your crop in under two minutes with guided questions and receive instant agronomic recommendations."}
          </p>
        </div>

        <div className="relative z-10">
          <Link
            to="/check"
            className="sf-btn sf-btn--accent sf-btn--lg text-sm sm:text-base font-bold inline-flex items-center gap-2 shadow-md hover:shadow-lg transition-transform hover:-translate-y-0.5"
          >
            <Stethoscope size={18} />
            <span>{t("landing.start_checking")}</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
