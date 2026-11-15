import type React from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BookOpen,
  Compass,
  GraduationCap,
  Languages,
  Leaf,
  ShieldCheck,
  Smartphone,
  Sprout,
  Stethoscope,
} from "lucide-react";

import aboutHeroField from "@/assets/images/about/about-hero-field.webp";
import aboutLeafDetail from "@/assets/images/about/about-leaf-detail.webp";
import aboutCtaBackground from "@/assets/images/about/about-cta-background.webp";

export function AboutPage(): React.JSX.Element {
  const { t } = useTranslation();

  const whatWeDoItems = [
    {
      Icon: Stethoscope,
      title: t("about.do_diagnosis_title"),
      description: t("about.do_diagnosis_desc"),
    },
    {
      Icon: BookOpen,
      title: t("about.do_library_title"),
      description: t("about.do_library_desc"),
    },
    {
      Icon: Languages,
      title: t("about.do_bilingual_title"),
      description: t("about.do_bilingual_desc"),
    },
    {
      Icon: Smartphone,
      title: t("about.do_field_title"),
      description: t("about.do_field_desc"),
    },
  ];

  const audienceItems = [
    {
      Icon: Sprout,
      title: t("about.who_growers_title"),
      description: t("about.who_growers_desc"),
    },
    {
      Icon: GraduationCap,
      title: t("about.who_students_title"),
      description: t("about.who_students_desc"),
    },
    {
      Icon: Compass,
      title: t("about.who_researchers_title"),
      description: t("about.who_researchers_desc"),
    },
  ];

  return (
    <div className="w-full space-y-12 sm:space-y-16 pb-12 text-[#27342D] dark:text-[#C5D6C8]">
      {/* =========================================================================
          SECTION 1: ABOUT TITLE (SPACIOUS EDITORIAL HEADING)
          ========================================================================= */}
      <header aria-label="About Sunflower Studio" className="space-y-2 pt-2">
        <p className="text-xs font-bold tracking-widest text-[#163D2C] dark:text-[#87A774] uppercase">
          {t("about.eyebrow")}
        </p>
        <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black tracking-tight text-[#163D2C] dark:text-[#F3F6F3] leading-[1.08] uppercase">
          {t("about.main_heading_part1")} <br />
          {t("about.main_heading_part2")}
        </h1>
      </header>

      {/* =========================================================================
          SECTION 2: WIDE SUNFLOWER HERO BANNER
          ========================================================================= */}
      <section
        aria-label="Sunflower Field Photograph"
        className="w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-stone-200/50 shadow-xs dark:border-white/10"
      >
        <img
          src={aboutHeroField}
          alt="Sunflower field at sunrise with a vibrant blooming sunflower in focus"
          className="h-[200px] sm:h-[300px] lg:h-[360px] xl:h-[400px] w-full object-cover object-center"
          loading="eager"
        />
      </section>

      {/* =========================================================================
          SECTION 3: PLATFORM INTRODUCTION (EDITORIAL TWO-COLUMN)
          ========================================================================= */}
      <section
        aria-labelledby="platform-intro-heading"
        className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-12 pt-2"
      >
        <div className="lg:col-span-7">
          <h2 id="platform-intro-heading" className="sr-only">
            {t("about.title")}
          </h2>
          <p className="text-2xl sm:text-3xl lg:text-[28px] font-bold leading-snug text-[#163D2C] dark:text-[#F3F6F3]">
            {t("about.lead_text")}
          </p>
        </div>
        <div className="lg:col-span-5 lg:border-l lg:border-[#163D2C]/15 lg:pl-10 dark:lg:border-white/10">
          <p className="text-sm sm:text-base leading-relaxed text-[#27342D] dark:text-[#C5D6C8]">
            {t("about.lead_support")}
          </p>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: INFORMATION GRID (OUR PURPOSE, WHAT WE DO, LEAF DETAIL)
          ========================================================================= */}
      <section
        aria-labelledby="purpose-heading"
        className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-12 lg:gap-10 items-start pt-2"
      >
        {/* Column 1: Our Purpose */}
        <div className="lg:col-span-4 space-y-2">
          <h2
            id="purpose-heading"
            className="text-lg sm:text-xl font-bold text-[#163D2C] dark:text-[#EFF5EF]"
          >
            {t("about.our_purpose_title")}
          </h2>
          <div className="h-0.5 w-10 bg-[#87A774] mt-1.5 mb-4 rounded-full" />
          <p className="text-sm sm:text-base leading-relaxed text-[#27342D] dark:text-[#C5D6C8]">
            {t("about.our_purpose_text")}
          </p>
        </div>

        {/* Column 2: What We Do */}
        <div className="lg:col-span-5 space-y-2">
          <h2 className="text-lg sm:text-xl font-bold text-[#163D2C] dark:text-[#EFF5EF]">
            {t("about.what_we_do_title")}
          </h2>
          <div className="h-0.5 w-10 bg-[#87A774] mt-1.5 mb-4 rounded-full" />
          <div className="space-y-4">
            {whatWeDoItems.map(({ Icon, title, description }) => (
              <div key={title} className="flex items-start gap-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E8F2E2] text-[#163D2C] dark:bg-[#1A3022] dark:text-[#A7CA98]">
                  <Icon size={18} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#163D2C] dark:text-[#EFF5EF]">
                    {title}
                  </h3>
                  <p className="text-xs sm:text-[13px] leading-relaxed text-[#4A584E] dark:text-[#B5C9BC]">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Botanical Leaf Specimen */}
        <div className="lg:col-span-3 overflow-hidden rounded-2xl sm:rounded-3xl border border-stone-200/50 shadow-xs dark:border-white/10 h-[260px] sm:h-[280px] w-full">
          <img
            src={aboutLeafDetail}
            alt="Sunflower leaf detail displaying natural foliage veins and symptom patterns"
            className="h-full w-full object-cover object-center"
            loading="lazy"
          />
        </div>
      </section>

      {/* =========================================================================
          SECTION 5 & 6: OUR MISSION & WHO CAN USE IT (SECOND EDITORIAL ROW)
          ========================================================================= */}
      <section
        aria-labelledby="mission-heading"
        className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12 items-start pt-2"
      >
        {/* Section 5: Our Mission */}
        <div className="lg:col-span-6 space-y-2">
          <h2
            id="mission-heading"
            className="text-lg sm:text-xl font-bold text-[#163D2C] dark:text-[#EFF5EF]"
          >
            {t("about.mission_title")}
          </h2>
          <div className="h-0.5 w-10 bg-[#87A774] mt-1.5 mb-4 rounded-full" />
          <div className="space-y-3">
            <p className="text-xl sm:text-2xl font-bold leading-snug text-[#163D2C] dark:text-[#F3F6F3]">
              {t("about.mission_heading")}
            </p>
            <p className="text-sm sm:text-base leading-relaxed text-[#4A584E] dark:text-[#C5D6C8]">
              {t("about.mission_desc")}
            </p>
          </div>
        </div>

        {/* Section 6: Who Can Use It */}
        <div className="lg:col-span-6 lg:border-l lg:border-[#163D2C]/15 lg:pl-10 dark:lg:border-white/10 space-y-2">
          <h2 className="text-lg sm:text-xl font-bold text-[#163D2C] dark:text-[#EFF5EF]">
            {t("about.who_can_use_title")}
          </h2>
          <div className="h-0.5 w-10 bg-[#87A774] mt-1.5 mb-4 rounded-full" />
          <div className="space-y-4">
            {audienceItems.map(({ Icon, title, description }) => (
              <div key={title} className="flex items-start gap-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E8F2E2] text-[#163D2C] dark:bg-[#1A3022] dark:text-[#A7CA98]">
                  <Icon size={18} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#163D2C] dark:text-[#EFF5EF]">
                    {title}
                  </h3>
                  <p className="text-xs sm:text-[13px] leading-relaxed text-[#4A584E] dark:text-[#B5C9BC]">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 8 (VISUALLY UNOBTRUSIVE): AGRICULTURAL ADVISORY NOTE
          ========================================================================= */}
      <div className="flex items-center justify-center gap-2 text-center text-xs text-[#5A685E] dark:text-[#95A89B] py-1 max-w-2xl mx-auto">
        <ShieldCheck size={15} className="shrink-0 text-[#87A774]" aria-hidden="true" />
        <span>{t("about.disclaimer_short")}</span>
      </div>

      {/* =========================================================================
          SECTION 9: CLOSING CTA (MATCHING TARGET-about-page.png)
          ========================================================================= */}
      <section
        aria-label="Sunflower Health Check Invitation"
        className="relative overflow-hidden rounded-3xl border border-[#87A774]/30 shadow-xs"
      >
        {/* Background Image: about-cta-background.webp */}
        <img
          src={aboutCtaBackground}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center"
          loading="lazy"
        />
        {/* Ambient overlay tint ensuring crisp typography contrast */}
        <div
          className="absolute inset-0 bg-[#FBF9F2]/50 dark:bg-[#111C15]/80"
          aria-hidden="true"
        />

        {/* Real interactive HTML content */}
        <div className="relative mx-auto max-w-2xl px-6 py-12 sm:py-16 text-center space-y-4">
          {/* Subtle botanical mark */}
          <div className="flex items-center justify-center gap-3">
            <span className="h-px w-10 bg-[#87A774]/50" />
            <Leaf size={18} className="text-[#356948] dark:text-[#87A774]" aria-hidden="true" />
            <span className="h-px w-10 bg-[#87A774]/50" />
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-extrabold text-[#163D2C] dark:text-[#F3F6F3] tracking-tight">
            {t("about.cta_target_heading")}
          </h2>

          <p className="mx-auto max-w-xl text-sm sm:text-base leading-relaxed text-[#27342D] dark:text-[#C5D6C8]">
            {t("about.cta_target_desc")}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
            <Link
              to="/check"
              className="inline-flex items-center gap-2 rounded-full bg-[#163D2C] px-6 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-[#0f2d20] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#87A774] dark:bg-[#87A774] dark:text-[#0E1712] dark:hover:bg-[#97b784]"
            >
              <Stethoscope size={17} aria-hidden="true" />
              {t("about.cta_btn_check")}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>

            <Link
              to="/diseases"
              className="inline-flex items-center gap-2 rounded-full border border-[#163D2C]/40 bg-white/70 px-6 py-3 text-sm font-semibold text-[#163D2C] shadow-2xs backdrop-blur-xs transition hover:bg-white hover:border-[#163D2C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#87A774] dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
            >
              <BookOpen size={17} aria-hidden="true" />
              {t("about.cta_btn_diseases")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
