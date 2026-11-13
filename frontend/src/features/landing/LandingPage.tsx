import type React from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Leaf,
  Sprout,
  BookOpen,
  ArrowRight,
  Microscope,
  LayoutGrid,
  Search,
  ListChecks,
  FileText,
  SunMedium,
  Trees,
  CheckCircle2,
} from "lucide-react";
import { useDiseases } from "@/features/diseases/hooks";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiFetch } from "@/api/client";

// High-resolution botanical assets tailored to the GreenNest reference
import heroSunflowerBloom from "@/assets/images/anatomy/hero-sunflower-bloom.jpg";
import cornerLeavesImg from "@/assets/images/anatomy/corner-leaves.svg";
import leavesImg from "@/assets/images/anatomy/leaves.jpg";
import stemsImg from "@/assets/images/anatomy/stems.jpg";
import headsImg from "@/assets/images/anatomy/heads.jpg";
import rootsImg from "@/assets/images/anatomy/roots.jpg";
import bannerSunflowerImg from "@/assets/images/anatomy/banner-sunflower.jpg";

import alternariaImg from "@/assets/images/anatomy/disease-alternaria.jpg";
import powderyImg from "@/assets/images/anatomy/disease-powdery.jpg";
import mosaicImg from "@/assets/images/anatomy/disease-mosaic.jpg";
import bacterialImg from "@/assets/images/anatomy/disease-bacterial.jpg";
import { getDiseaseImage } from "@/features/diseases/utils/diseaseImages";

interface SystemStats {
  total_diseases: number;
  total_symptoms: number;
  published_diseases: number;
}

async function fetchSystemStats(): Promise<SystemStats> {
  return apiFetch<SystemStats>("/public/stats");
}

function getPathogenBadgeClass(type?: string): string {
  switch (type?.toLowerCase()) {
    case "fungal":
    case "fungus":
      return "bg-[#F3E8FF] text-[#6B21A8] border-[#E9D5FF] dark:bg-[#6B21A8]/20 dark:text-[#D8B4FE] dark:border-[#6B21A8]/40";
    case "bacterial":
    case "bacteria":
      return "bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD] dark:bg-[#0369A1]/20 dark:text-[#7DD3FC] dark:border-[#0369A1]/40";
    case "viral":
    case "virus":
      return "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A] dark:bg-[#92400E]/20 dark:text-[#FCD34D] dark:border-[#92400E]/40";
    default:
      return "bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700";
  }
}

/**
 * Refined two-leaf botanical flourish divider.
 */
function BotanicalFlourish(): React.JSX.Element {
  return (
    <div className="flex items-center justify-center gap-3 my-3 opacity-70" aria-hidden="true">
      <div className="w-10 sm:w-16 h-px bg-gradient-to-r from-transparent to-[#87A774]/50" />
      <span className="text-xs text-[#87A774] leading-none select-none tracking-widest">✦ ✦ ✦</span>
      <div className="w-10 sm:w-16 h-px bg-gradient-to-l from-transparent to-[#87A774]/50" />
    </div>
  );
}

/**
 * Section heading component for consistent visual hierarchy.
 */
function SectionHeading({
  title,
  subtitle,
  centered = true,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  centered?: boolean;
}): React.JSX.Element {
  return (
    <div className={`space-y-2 max-w-xl ${centered ? "mx-auto text-center" : ""}`}>
      <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1B3B2B] dark:text-[#F3F6F3] tracking-tight leading-tight">
        {title}
      </h2>
      <BotanicalFlourish />
      {subtitle && (
        <p className="text-sm text-[#4A584E] dark:text-[#9BB5A8] leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}

export function LandingPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const isKhmer = i18n.language === "km";

  const { data: featuredData, isLoading: isDiseasesLoading, isError: isDiseasesError } = useDiseases({
    page: 1,
    size: 4,
    published: true,
  });

  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["system-stats"],
    queryFn: fetchSystemStats,
    staleTime: 60000,
  });

  // 4 canonical plant anatomy cards matching the GreenNest reference
  const anatomyCards = [
    {
      id: "leaves",
      name: isKhmer ? "ស្លឹក" : "Leaves",
      desc: isKhmer
        ? "អុចស្លឹក, រលួយ, ឡើងម្សៅ, ក្រៀមស្វិត"
        : "Spots, blight, yellowing, wilting, and more",
      image: leavesImg,
      icon: Leaf,
    },
    {
      id: "stems",
      name: isKhmer ? "ដើម" : "Stems",
      desc: isKhmer
        ? "ស្នាមជាំខ្មៅ, ដំបៅដើម, ស្អុយដើម"
        : "Lesions, rot, and stem damage",
      image: stemsImg,
      icon: Sprout,
    },
    {
      id: "flower_heads",
      name: isKhmer ? "ក្បាលផ្កា" : "Flower Heads",
      desc: isKhmer
        ? "ស្អុយក្បាលផ្កា, ផ្សិតពណ៌ស, គ្រាប់មិនពេញ"
        : "Mold, rot, and deformation",
      image: headsImg,
      icon: SunMedium,
    },
    {
      id: "roots",
      name: isKhmer ? "ឫស" : "Roots",
      desc: isKhmer
        ? "រលួយគល់, ក្រិនមិនលូតលាស់, ឫសស្វិត"
        : "Root rot, poor growth, and plant decline",
      image: rootsImg,
      icon: Trees,
    },
  ];

  // 4 reference diseases for instant fallback & visual parity
  const referenceDiseases = [
    {
      slug: "alternaria-leaf-spot",
      name: isKhmer ? "ជំងឺអុចស្លឹក Alternaria" : "Alternaria Leaf Spot",
      type: "Fungal",
      badgeClass: getPathogenBadgeClass("Fungal"),
      desc: isKhmer
        ? "ចំណុចអុចពណ៌ត្នោតចាស់លើស្លឹក ជារឿយៗមានរង្វង់លឿងព័ទ្ធជុំវិញ។"
        : "Dark brown spots on leaves, often with yellow halos.",
      image: getDiseaseImage("alternaria-leaf-spot") || alternariaImg,
    },
    {
      slug: "powdery-mildew",
      name: isKhmer ? "ជំងឺផ្សិតម្សៅ Powdery Mildew" : "Powdery Mildew",
      type: "Fungal",
      badgeClass: getPathogenBadgeClass("Fungal"),
      desc: isKhmer
        ? "ការលូតលាស់នៃម្សៅពណ៌សនៅលើផ្ទៃស្លឹក និងដើម។"
        : "White, powdery growth on leaves and stems.",
      image: getDiseaseImage("powdery-mildew") || powderyImg,
    },
    {
      slug: "sunflower-mosaic-virus",
      name: isKhmer ? "វីរុសម៉ូសេអ៊ិចផ្កាឈូករ័ត្ន" : "Sunflower Mosaic Virus",
      type: "Viral",
      badgeClass: getPathogenBadgeClass("Viral"),
      desc: isKhmer
        ? "លំនាំឆ្នូតពណ៌លឿង និងបៃតងលើស្លឹក ដើមក្រិនមិនលូតលាស់។"
        : "Mottled yellow and green pattern on leaves, stunted growth.",
      image: getDiseaseImage("sunflower-mosaic-virus") || mosaicImg,
    },
    {
      slug: "bacterial-stalk-rot",
      name: isKhmer ? "ជំងឺរលួយដើមបាក់តេរី" : "Bacterial Stem Rot",
      type: "Bacterial",
      badgeClass: getPathogenBadgeClass("Bacterial"),
      desc: isKhmer
        ? "ដំបៅជាំទឹកទន់ៗនៅលើដើម នាំឱ្យដើមដួលរលំ និងស្វិត។"
        : "Soft, water-soaked lesions on stems, leading to plant wilting.",
      image: getDiseaseImage("bacterial-stalk-head-rot") || bacterialImg,
    },
  ];

  // Determine which disease cards to show: live backend or reference fallback
  const hasLiveItems = !isDiseasesLoading && !isDiseasesError && (featuredData?.items?.length ?? 0) > 0;
  const displayedDiseases = hasLiveItems
    ? (featuredData?.items ?? []).slice(0, 4).map((item) => ({
        slug: item.slug,
        name: item.name,
        type: item.pathogen_type,
        badgeClass: getPathogenBadgeClass(item.pathogen_type),
        desc:
          item.description ||
          (isKhmer
            ? "ជំងឺដំណាំផ្កាឈូករ័ត្នដែលបានកត់ត្រាក្នុងប្រព័ន្ធ។"
            : "Common disease affecting sunflower crops."),
        image: getDiseaseImage(item.slug, item.image_url) || alternariaImg,
      }))
    : referenceDiseases;

  return (
    <div className="space-y-16 sm:space-y-24 py-2 sm:py-6 max-w-6xl mx-auto">
      {/* =========================================================================
         1. HERO SECTION — Premium Editorial Split Layout
         ========================================================================= */}
      <section
        className="relative rounded-3xl overflow-hidden bg-[#F7F5EE] dark:bg-[#111F17]/95 border border-stone-200/80 dark:border-white/[0.07] shadow-sm"
        aria-label={isKhmer ? "ទំព័រដើម" : "Homepage hero"}
      >
        {/* Botanical corner accent — top-left */}
        <img
          src={cornerLeavesImg}
          alt=""
          aria-hidden="true"
          className="absolute top-0 left-0 w-32 sm:w-44 lg:w-52 pointer-events-none opacity-70 select-none z-0"
        />

        {/* Subtle warm gradient wash bottom */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#E4AD45]/5 via-transparent to-[#87A774]/5 pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-6">
          {/* ── Left text column ── */}
          <div className="lg:col-span-7 flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-12 lg:px-12 lg:py-14 space-y-7">
            {/* Badge pill */}
            <div className="inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full bg-white/85 dark:bg-[#1A2C22]/85 backdrop-blur-sm border border-[#87A774]/30 dark:border-[#87A774]/20 text-[#224D3A] dark:text-[#87A774] text-xs font-bold shadow-xs tracking-wide">
              <Leaf size={13} className="shrink-0" aria-hidden="true" />
              <span>{isKhmer ? "ការធ្វើរោគវិនិច្ឆ័យដោយ AI" : "AI-Powered Plant Diagnosis"}</span>
            </div>

            {/* Primary headline */}
            <div className="space-y-1">
              <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold tracking-tight text-[#1B3B2B] dark:text-[#EFF5EF] leading-[1.08]">
                {isKhmer ? (
                  <>
                    ប្រព័ន្ធជំនាញ
                    <br />
                    <span className="text-[#224D3A] dark:text-[#87A774]">
                      ធ្វើរោគវិនិច្ឆ័យ
                    </span>
                    <br />
                    ជំងឺផ្កាឈូករ័ត្ន
                  </>
                ) : (
                  <>
                    Sunflower Disease
                    <br />
                    <span className="text-[#224D3A] dark:text-[#87A774]">
                      Diagnosis
                    </span>{" "}
                    Expert
                  </>
                )}
              </h1>
              {!isKhmer && (
                <p className="text-3xl sm:text-4xl lg:text-[2.3rem] font-extrabold tracking-tight text-[#1B3B2B] dark:text-[#EFF5EF] leading-[1.1]">
                  System
                </p>
              )}
            </div>

            {/* Sub-description */}
            <p className="text-sm sm:text-[0.95rem] text-[#3F5146] dark:text-[#9BB5A8] leading-[1.75] max-w-md font-normal">
              {t("landing.hero_subtitle")}
            </p>

            {/* CTA row */}
            <div className="flex items-center gap-3 flex-wrap">
              <Link
                to="/check"
                className="inline-flex items-center gap-2 bg-[#1B3B2B] hover:bg-[#122A1E] dark:bg-[#87A774] dark:hover:bg-[#97B884] text-white dark:text-[#0E1712] font-bold text-sm px-6 py-3 rounded-full shadow hover:shadow-md transition-all duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#224D3A] focus-visible:ring-offset-2"
              >
                <Leaf
                  size={16}
                  className="shrink-0 motion-safe:transition-transform motion-safe:duration-200 group-hover:rotate-12"
                  aria-hidden="true"
                />
                <span>{isKhmer ? "ចាប់ផ្តើមធ្វើរោគវិនិច្ឆ័យ" : "Start Diagnosis"}</span>
                <ArrowRight
                  size={15}
                  className="shrink-0 motion-safe:transition-transform motion-safe:duration-200 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>

              <Link
                to="/diseases"
                className="inline-flex items-center gap-2 bg-white/90 dark:bg-[#192720]/90 hover:bg-white dark:hover:bg-[#1F3028] text-[#1B3B2B] dark:text-[#C4D9CC] border border-stone-200/90 dark:border-white/10 font-semibold text-sm px-6 py-3 rounded-full transition-all duration-200 shadow-xs hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#224D3A] focus-visible:ring-offset-2"
              >
                <BookOpen
                  size={16}
                  className="shrink-0 text-[#224D3A] dark:text-[#87A774]"
                  aria-hidden="true"
                />
                <span>{isKhmer ? "ស្វែងរកបណ្ណាល័យជំងឺ" : "Explore Diseases"}</span>
              </Link>
            </div>

            {/* Trust signals */}
            <div className="flex items-center gap-4 pt-1">
              <div className="flex items-center gap-1.5 text-[0.72rem] text-[#607366] dark:text-[#7A9B88] font-medium">
                <CheckCircle2 size={13} className="text-[#87A774]" aria-hidden="true" />
                <span>{isKhmer ? "ជំងឺ ២០+ ប្រភេទ" : "20+ Diseases"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[0.72rem] text-[#607366] dark:text-[#7A9B88] font-medium">
                <CheckCircle2 size={13} className="text-[#87A774]" aria-hidden="true" />
                <span>{isKhmer ? "ភាសាខ្មែរ–អង់គ្លេស" : "Bilingual KM/EN"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[0.72rem] text-[#607366] dark:text-[#7A9B88] font-medium">
                <CheckCircle2 size={13} className="text-[#87A774]" aria-hidden="true" />
                <span>{isKhmer ? "PWA ក្រៅបណ្តាញ" : "Offline PWA"}</span>
              </div>
            </div>
          </div>

          {/* ── Right photographic column ── */}
          <div className="lg:col-span-5 relative min-h-[260px] sm:min-h-[340px] lg:min-h-[480px]">
            <img
              src={heroSunflowerBloom}
              alt={
                isKhmer
                  ? "ផ្កាឈូករ័ត្នដុះដាលក្នុងចំការ"
                  : "Sunflower blooming in the field"
              }
              className="absolute inset-0 w-full h-full object-cover object-center"
              loading="eager"
              fetchPriority="high"
            />
            {/* Fade to left so text never overlaps */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-[#F7F5EE] dark:from-[#111F17] via-[#F7F5EE]/30 dark:via-[#111F17]/30 to-transparent lg:block hidden pointer-events-none"
              aria-hidden="true"
            />
            {/* Subtle vignette bottom */}
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none"
              aria-hidden="true"
            />
          </div>
        </div>
      </section>

      {/* =========================================================================
         2. STATISTICS CARDS — Clean floating cards below hero
         ========================================================================= */}
      <section
        className="relative -mt-6 sm:-mt-10 z-20 px-1 sm:px-4"
        aria-label={isKhmer ? "ស្ថិតិប្រព័ន្ធ" : "System statistics"}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
          {/* Card 1: Published Diseases */}
          <div className="bg-white dark:bg-[#192720] rounded-2xl p-5 sm:p-6 shadow-md shadow-emerald-950/[0.06] border border-stone-200/70 dark:border-white/[0.08] flex items-center gap-4 motion-safe:transition-transform motion-safe:hover:-translate-y-0.5">
            <div className="w-11 h-11 rounded-xl bg-[#EDF5EE] dark:bg-[#0F2018] text-[#224D3A] dark:text-[#87A774] flex items-center justify-center shrink-0 border border-[#87A774]/25" aria-hidden="true">
              <Sprout size={22} />
            </div>
            <div className="min-w-0">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#1B3B2B] dark:text-[#EFF5EF] font-mono leading-none tabular-nums">
                {isStatsLoading ? (
                  <Skeleton height="1.875rem" width="2.5rem" className="rounded-md" />
                ) : (
                  stats?.published_diseases ?? 0
                )}
              </div>
              <div className="text-xs font-semibold text-[#607366] dark:text-[#7A9B88] mt-1.5 leading-tight">
                {isKhmer ? "ជំងឺបានបោះពុម្ពផ្សាយ" : "Published Diseases"}
              </div>
            </div>
          </div>

          {/* Card 2: Symptom Indicators */}
          <div className="bg-white dark:bg-[#192720] rounded-2xl p-5 sm:p-6 shadow-md shadow-emerald-950/[0.06] border border-stone-200/70 dark:border-white/[0.08] flex items-center gap-4 motion-safe:transition-transform motion-safe:hover:-translate-y-0.5">
            <div className="w-11 h-11 rounded-xl bg-[#EDF5EE] dark:bg-[#0F2018] text-[#224D3A] dark:text-[#87A774] flex items-center justify-center shrink-0 border border-[#87A774]/25" aria-hidden="true">
              <Microscope size={22} />
            </div>
            <div className="min-w-0">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#1B3B2B] dark:text-[#EFF5EF] font-mono leading-none tabular-nums">
                {isStatsLoading ? (
                  <Skeleton height="1.875rem" width="2.5rem" className="rounded-md" />
                ) : (
                  stats?.total_symptoms ?? 0
                )}
              </div>
              <div className="text-xs font-semibold text-[#607366] dark:text-[#7A9B88] mt-1.5 leading-tight">
                {isKhmer ? "សូចនាកររោគសញ្ញា" : "Symptom Indicators"}
              </div>
            </div>
          </div>

          {/* Card 3: Plant Anatomy Zones */}
          <div className="bg-white dark:bg-[#192720] rounded-2xl p-5 sm:p-6 shadow-md shadow-emerald-950/[0.06] border border-stone-200/70 dark:border-white/[0.08] flex items-center gap-4 motion-safe:transition-transform motion-safe:hover:-translate-y-0.5">
            <div className="w-11 h-11 rounded-xl bg-[#FBF4E2] dark:bg-[#1E1500] text-[#9A6B1A] dark:text-[#E4AD45] flex items-center justify-center shrink-0 border border-[#E4AD45]/30" aria-hidden="true">
              <LayoutGrid size={22} />
            </div>
            <div className="min-w-0">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#1B3B2B] dark:text-[#EFF5EF] font-mono leading-none tabular-nums">
                4
              </div>
              <div className="text-xs font-semibold text-[#607366] dark:text-[#7A9B88] mt-1.5 leading-tight">
                {isKhmer ? "ផ្នែកកាយវិភាគវិទ្យា" : "Plant Anatomy Zones"}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
         3. PLANT ANATOMY — Visual care cards with consistent proportions
         ========================================================================= */}
      <section className="space-y-8" aria-labelledby="anatomy-heading">
        <SectionHeading
          title={
            <span id="anatomy-heading">
              {isKhmer ? "ស្វែងយល់ផ្នែកកាយវិភាគ" : "Explore Plant Anatomy"}
            </span>
          }
          subtitle={
            isKhmer
              ? "ជ្រើសរើសផ្នែកដំណាំដើម្បីស្វែងយល់ពីរោគសញ្ញាទូទៅ និងជំងឺដែលពាក់ព័ន្ធ។"
              : "Select a plant part to learn about common symptoms and related diseases."
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {anatomyCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.id}
                to="/check"
                className="bg-white dark:bg-[#192720] rounded-2xl overflow-hidden border border-stone-200/70 dark:border-white/[0.08] shadow-xs hover:shadow-md hover:border-[#87A774]/40 dark:hover:border-[#87A774]/30 motion-safe:transition-all motion-safe:duration-200 group flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#224D3A] focus-visible:ring-offset-2"
              >
                {/* Fixed-ratio image area */}
                <div className="w-full aspect-[4/3] overflow-hidden bg-stone-100 dark:bg-stone-800 shrink-0">
                  <img
                    src={card.image}
                    alt={card.name}
                    className="w-full h-full object-cover object-center motion-safe:transition-transform motion-safe:duration-500 group-hover:scale-[1.04]"
                    loading="lazy"
                  />
                </div>

                {/* Text area — flex grow so arrow always at bottom */}
                <div className="flex flex-col flex-1 p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-lg bg-[#EDF5EE] dark:bg-[#0F2018] text-[#224D3A] dark:text-[#87A774] flex items-center justify-center shrink-0">
                      <Icon size={15} aria-hidden="true" />
                    </div>
                    <h3 className="text-sm sm:text-[0.9rem] font-bold text-[#1B3B2B] dark:text-[#EFF5EF] group-hover:text-[#224D3A] dark:group-hover:text-[#87A774] transition-colors leading-tight">
                      {card.name}
                    </h3>
                  </div>
                  <p className="text-[0.72rem] sm:text-xs text-[#607366] dark:text-[#7A9B88] leading-relaxed flex-1">
                    {card.desc}
                  </p>
                  <div className="flex justify-end mt-3">
                    <div className="w-7 h-7 rounded-full bg-stone-100 dark:bg-[#0F2018] text-stone-500 dark:text-[#87A774] group-hover:bg-[#1B3B2B] group-hover:text-white dark:group-hover:bg-[#87A774] dark:group-hover:text-[#0E1712] flex items-center justify-center motion-safe:transition-all motion-safe:duration-200">
                      <ArrowRight size={13} aria-hidden="true" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
         4. HOW IT WORKS — Elegant 3-step process with connectors
         ========================================================================= */}
      <section className="space-y-8" aria-labelledby="process-heading">
        <SectionHeading
          title={
            <span id="process-heading">
              {isKhmer ? "របៀបដំណើរការវិនិច្ឆ័យ" : "How the Diagnosis Works"}
            </span>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
          {/* Connector lines (desktop only) */}
          <div
            className="absolute top-10 left-[calc(33.33%+1rem)] right-[calc(33.33%+1rem)] h-px bg-gradient-to-r from-[#87A774]/30 via-[#87A774]/60 to-[#87A774]/30 hidden md:block pointer-events-none"
            aria-hidden="true"
          />

          {/* Step 1 */}
          <div className="bg-white dark:bg-[#192720] rounded-2xl p-6 sm:p-7 border border-stone-200/70 dark:border-white/[0.08] shadow-xs hover:shadow-md hover:border-[#87A774]/40 dark:hover:border-[#87A774]/30 motion-safe:transition-all space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-[#1B3B2B] dark:bg-[#87A774] text-white dark:text-[#0E1712] font-black text-sm flex items-center justify-center shadow-sm">
                  1
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-[#EDF5EE] dark:bg-[#0F2018] text-[#224D3A] dark:text-[#87A774] flex items-center justify-center border border-[#87A774]/20">
                <Search size={18} aria-hidden="true" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-[#1B3B2B] dark:text-[#EFF5EF]">
                {isKhmer ? "សង្កេតរោគសញ្ញា" : "Observe Symptoms"}
              </h3>
              <p className="text-xs sm:text-sm text-[#4A584E] dark:text-[#9BB5A8] leading-relaxed">
                {isKhmer
                  ? "ពិនិត្យដំណាំផ្កាឈូករ័ត្នរបស់អ្នក និងកត់សម្គាល់រោគសញ្ញាដែលមើលឃើញ (អុចស្លឹក ដំបៅ ក្រៀមស្វិត)។"
                  : "Inspect your sunflower plant and note visible symptoms — spots, lesions, or wilting."}
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white dark:bg-[#192720] rounded-2xl p-6 sm:p-7 border border-stone-200/70 dark:border-white/[0.08] shadow-xs hover:shadow-md hover:border-[#87A774]/40 dark:hover:border-[#87A774]/30 motion-safe:transition-all space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-[#1B3B2B] dark:bg-[#87A774] text-white dark:text-[#0E1712] font-black text-sm flex items-center justify-center shadow-sm">
                  2
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-[#EDF5EE] dark:bg-[#0F2018] text-[#224D3A] dark:text-[#87A774] flex items-center justify-center border border-[#87A774]/20">
                <ListChecks size={18} aria-hidden="true" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-[#1B3B2B] dark:text-[#EFF5EF]">
                {isKhmer ? "ជ្រើសរើសរោគសញ្ញា" : "Select Symptoms"}
              </h3>
              <p className="text-xs sm:text-sm text-[#4A584E] dark:text-[#9BB5A8] leading-relaxed">
                {isKhmer
                  ? "ជ្រើសរើសរោគសញ្ញាដែលត្រូវគ្នាពីបញ្ជីណែនាំតាមផ្នែកដំណាំ (ស្លឹក ដើម ក្បាលផ្កា ឬឫស)។"
                  : "Pick matching symptoms from our guided list by plant part — leaf, stem, flower head, or root."}
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white dark:bg-[#192720] rounded-2xl p-6 sm:p-7 border border-stone-200/70 dark:border-white/[0.08] shadow-xs hover:shadow-md hover:border-[#E4AD45]/40 dark:hover:border-[#E4AD45]/30 motion-safe:transition-all space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-[#C68A1B] dark:bg-[#E4AD45] text-white dark:text-[#1A0E00] font-black text-sm flex items-center justify-center shadow-sm">
                  3
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-[#FBF4E2] dark:bg-[#1E1500] text-[#9A6B1A] dark:text-[#E4AD45] flex items-center justify-center border border-[#E4AD45]/30">
                <FileText size={18} aria-hidden="true" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-[#1B3B2B] dark:text-[#EFF5EF]">
                {isKhmer ? "ទទួលបានលទ្ធផល" : "Get Your Diagnosis"}
              </h3>
              <p className="text-xs sm:text-sm text-[#4A584E] dark:text-[#9BB5A8] leading-relaxed">
                {isKhmer
                  ? "ទទួលបានលទ្ធផលរោគវិនិច្ឆ័យជាមួយកម្រិតទំនុកចិត្ត និងការណែនាំគ្រប់គ្រងជាក់ស្តែង។"
                  : "Receive possible diseases with confidence scores and actionable management recommendations."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
         5. FEATURED DISEASES — Live backend cards with clean image treatment
         ========================================================================= */}
      <section className="space-y-7" aria-labelledby="diseases-heading">
        {/* Section header row */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <h2
              id="diseases-heading"
              className="text-2xl sm:text-3xl font-extrabold text-[#1B3B2B] dark:text-[#EFF5EF] tracking-tight"
            >
              {isKhmer ? "ជំងឺផ្កាឈូករ័ត្នចម្បងៗ" : "Featured Sunflower Diseases"}
            </h2>
            <BotanicalFlourish />
            <p className="text-sm text-[#4A584E] dark:text-[#9BB5A8]">
              {isKhmer
                ? "ស្វែងយល់អំពីមេរោគចម្បងៗដែលប៉ះពាល់ដល់ដំណាំផ្កាឈូករ័ត្ន។"
                : "Common and important pathogens affecting sunflower crops."}
            </p>
          </div>
          <Link
            to="/diseases"
            className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B3B2B] dark:text-[#87A774] border border-stone-200 dark:border-white/10 px-4 py-2 rounded-full hover:bg-stone-50 dark:hover:bg-[#192720] motion-safe:transition-colors shrink-0 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#224D3A] focus-visible:ring-offset-1"
          >
            <span>{isKhmer ? "មើលជំងឺទាំងអស់" : "View All Diseases"}</span>
            <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>

        {/* Loading skeletons */}
        {isDiseasesLoading ? (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
            aria-busy="true"
            aria-label={isKhmer ? "កំពុងផ្ទុក" : "Loading diseases"}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-[#192720] rounded-2xl border border-stone-200/70 dark:border-white/[0.08] overflow-hidden"
              >
                <Skeleton height="10rem" className="rounded-none" />
                <div className="p-4 space-y-2.5">
                  <Skeleton height="1.1rem" width="40%" className="rounded-md" />
                  <Skeleton height="1.25rem" width="80%" className="rounded-lg" />
                  <Skeleton height="0.85rem" width="95%" className="rounded-md" />
                  <Skeleton height="0.85rem" width="70%" className="rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : isDiseasesError ? (
          /* Error state */
          <div className="rounded-2xl border border-stone-200/70 dark:border-white/[0.08] bg-white dark:bg-[#192720] p-8 text-center space-y-2">
            <p className="text-sm font-semibold text-[#1B3B2B] dark:text-[#EFF5EF]">
              {isKhmer ? "មិនអាចផ្ទុកទិន្នន័យ" : "Unable to load diseases"}
            </p>
            <p className="text-xs text-[#607366] dark:text-[#7A9B88]">
              {isKhmer ? "សូមព្យាយាមម្តងទៀតនៅពេលក្រោយ។" : "Please try again later."}
            </p>
          </div>
        ) : (
          /* Disease cards grid */
          <>
            {!hasLiveItems && (
              <div className="text-[0.72rem] text-[#87A774] dark:text-[#87A774]/70 italic px-1">
                {isKhmer
                  ? "* ជំងឺខាងក្រោមជាឧទាហរណ៍ — ទិន្នន័យពិតអាចមើលបានក្នុងបណ្ណាល័យជំងឺ"
                  : "* Reference examples shown — live data available in the disease library"}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {displayedDiseases.map((disease) => (
                <Link
                  key={disease.slug}
                  to={`/diseases/${disease.slug}`}
                  className="bg-white dark:bg-[#192720] rounded-2xl overflow-hidden border border-stone-200/70 dark:border-white/[0.08] shadow-xs hover:shadow-md hover:border-[#87A774]/40 dark:hover:border-[#87A774]/30 motion-safe:transition-all motion-safe:duration-200 group flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#224D3A] focus-visible:ring-offset-2"
                >
                  {/* Fixed image ratio */}
                  <div className="w-full aspect-[16/11] overflow-hidden bg-stone-100 dark:bg-stone-800 relative shrink-0">
                    <img
                      src={disease.image}
                      alt={disease.name}
                      className="w-full h-full object-cover object-center motion-safe:transition-transform motion-safe:duration-500 group-hover:scale-[1.04]"
                      loading="lazy"
                    />
                    {/* Subtle bottom-fade for legibility below */}
                    <div
                      className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"
                      aria-hidden="true"
                    />
                  </div>

                  {/* Card body */}
                  <div className="flex flex-col flex-1 p-4 sm:p-5 space-y-2">
                    <span
                      className={`inline-block self-start text-[0.65rem] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border ${disease.badgeClass}`}
                    >
                      {disease.type}
                    </span>
                    <h3 className="text-sm sm:text-[0.9rem] font-bold text-[#1B3B2B] dark:text-[#EFF5EF] group-hover:text-[#224D3A] dark:group-hover:text-[#87A774] transition-colors leading-snug">
                      {disease.name}
                    </h3>
                    <p className="text-[0.72rem] sm:text-xs text-[#607366] dark:text-[#7A9B88] leading-relaxed line-clamp-2 flex-1">
                      {disease.desc}
                    </p>
                  </div>

                  {/* Arrow affordance */}
                  <div className="px-4 sm:px-5 pb-4 pt-0 flex justify-end">
                    <div className="w-7 h-7 rounded-full bg-stone-100 dark:bg-[#0F2018] text-stone-500 dark:text-[#87A774] group-hover:bg-[#1B3B2B] group-hover:text-white dark:group-hover:bg-[#87A774] dark:group-hover:text-[#0E1712] flex items-center justify-center motion-safe:transition-all motion-safe:duration-200">
                      <ArrowRight size={13} aria-hidden="true" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>

      {/* =========================================================================
         6. CTA BANNER — Forest-green full-width with bloom photograph
         ========================================================================= */}
      <section
        className="rounded-3xl bg-[#1B3B2B] text-white relative overflow-hidden shadow-lg"
        aria-label={isKhmer ? "ចាប់ផ្តើមវិនិច្ឆ័យ" : "Start a diagnosis"}
      >
        {/* Right photograph composition */}
        <div
          className="absolute right-0 top-0 bottom-0 w-[45%] sm:w-2/5 overflow-hidden pointer-events-none hidden sm:block"
          aria-hidden="true"
        >
          <img
            src={bannerSunflowerImg}
            alt=""
            className="w-full h-full object-cover object-center"
            loading="lazy"
          />
          {/* Gradient overlay left-to-right so text stays legible */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#1B3B2B] via-[#1B3B2B]/55 to-transparent" />
        </div>

        {/* CTA content */}
        <div className="relative z-10 max-w-lg px-7 py-10 sm:px-10 sm:py-12 lg:px-12 lg:py-14 space-y-5">
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl bg-white/[0.12] text-[#87A774] flex items-center justify-center border border-white/[0.15]">
            <Leaf size={18} aria-hidden="true" />
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-[2.1rem] font-extrabold tracking-tight text-white leading-[1.14]">
            {isKhmer
              ? "ត្រៀមខ្លួនវិនិច្ឆ័យ\nដំណាំផ្កាឈូករ័ត្នហើយឬនៅ?"
              : <>
                  Ready to Diagnose
                  <br />
                  Your Sunflower?
                </>
            }
          </h2>

          <p className="text-sm text-white/80 leading-relaxed max-w-sm font-normal">
            {isKhmer
              ? "ចាប់ផ្តើមការវិនិច្ឆ័យផ្អែកលើរោគសញ្ញាឥឡូវនេះ និងទទួលបានការណែនាំពីអ្នកជំនាញ។"
              : "Start a symptom-based diagnosis now and receive expert guidance for treatment and management."}
          </p>

          <div className="pt-1">
            <Link
              to="/check"
              className="inline-flex items-center gap-2 bg-white hover:bg-stone-100 text-[#1B3B2B] font-bold text-sm px-6 py-3 rounded-full shadow-md hover:shadow-lg motion-safe:transition-all motion-safe:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B3B2B]"
            >
              <Leaf size={15} className="text-[#224D3A] shrink-0" aria-hidden="true" />
              <span>{isKhmer ? "ចាប់ផ្តើមវិនិច្ឆ័យឥឡូវនេះ" : "Start Diagnosis Now"}</span>
              <ArrowRight size={14} className="shrink-0" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
