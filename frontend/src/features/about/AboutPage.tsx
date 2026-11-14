import type React from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  FileText,
  Languages,
  Leaf,
  ListChecks,
  Microscope,
  Search,
  ShieldCheck,
  Smartphone,
  Sprout,
} from "lucide-react";
import sunflowerField from "@/assets/images/anatomy/banner-sunflower.jpg";
import sunflowerLeaves from "@/assets/images/anatomy/leaves.jpg";

/**
 * Standalone About page — presentation only.
 * All actions use the existing public routes; no backend or diagnosis logic is changed.
 */
export function AboutPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const isKhmer = (i18n.resolvedLanguage ?? i18n.language).startsWith("km");

  const copy = isKhmer
    ? {
        eyebrow: "ស្គាល់ Sunflower Studio",
        heroLine1: "យល់ដឹងពីដំណាំ",
        heroLine2: "ថែរក្សាផ្កាឈូករ័ត្នឱ្យប្រសើរ",
        heroIntro: "ចំណេះដឹងកសិកម្មដែលងាយស្រួលប្រើ សម្រាប់ការសង្កេតរោគសញ្ញា និងការសម្រេចចិត្តក្នុងចម្ការ។",
        badge1: "ផ្អែកលើរោគសញ្ញា",
        badge2: "ខ្មែរ និងអង់គ្លេស",
        badge3: "ជំនួយការសម្រេចចិត្ត",
        photoCaption: "ចាប់ផ្តើមពីការសង្កេតពិតប្រាកដ",
        photoDetail: "សិក្សាពីរោគសញ្ញា និងជំងឺដំណាំ",
        missionEyebrow: "០១ / គោលបំណងរបស់យើង",
        missionTitle: "ភ្ជាប់ការសង្កេតក្នុងចម្ការជាមួយចំណេះដឹងក្សេត្រសាស្ត្រ",
        missionDetail: "Sunflower Studio ជួយរៀបចំព័ត៌មានអំពីរោគសញ្ញាដំណាំឱ្យងាយយល់។ អ្នកអាចសង្កេតផ្នែកផ្សេងៗនៃផ្កាឈូករ័ត្ន ប្រៀបធៀបរោគសញ្ញា និងពិនិត្យការណែនាំពីប្រព័ន្ធជំនាញ។",
        missionNote: "បង្កើតសម្រាប់កសិករ និស្សិត និងអ្នកសិក្សាក្សេត្រសាស្ត្រ។",
        featuresEyebrow: "០២ / សមត្ថភាពប្រព័ន្ធ",
        featuresTitle: "ឧបករណ៍សាមញ្ញ សម្រាប់សំណួរសំខាន់ៗ",
        featuresIntro: "រចនាឡើងដើម្បីឱ្យព័ត៌មានសំខាន់ៗងាយស្រួលអាន និងប្រើប្រាស់។",
        flowEyebrow: "០៣ / ដំណើរការវិនិច្ឆ័យ",
        flowTitle: "ពីរោគសញ្ញា ទៅការណែនាំ",
        flowIntro: "បីជំហានងាយៗក្នុងការស្វែងយល់ពីបញ្ហាដំណាំរបស់អ្នក។",
        flow1: "សង្កេត",
        flow2: "ជ្រើសរើស",
        flow3: "ពិនិត្យលទ្ធផល",
        advisoryEyebrow: "ការប្រើប្រាស់ដោយមានការទទួលខុសត្រូវ",
        ctaEyebrow: "ចាប់ផ្តើមជាមួយ Sunflower Studio",
        ctaTitle: "ត្រៀមពិនិត្យសុខភាពផ្កាឈូករ័ត្នរបស់អ្នកហើយឬនៅ?",
        ctaDescription: "ជ្រើសរើសរោគសញ្ញាដែលអ្នកសង្កេតឃើញ និងស្វែងយល់ពីការណែនាំរបស់ប្រព័ន្ធជំនាញ។",
      }
    : {
        eyebrow: "Meet Sunflower Studio",
        heroLine1: "Know your plants.",
        heroLine2: "Grow with confidence.",
        heroIntro: "Practical agricultural knowledge for understanding sunflower symptoms and making more informed field decisions.",
        badge1: "Symptom-led",
        badge2: "Khmer & English",
        badge3: "Decision support",
        photoCaption: "It starts with observation",
        photoDetail: "Explore the signs your plants are showing",
        missionEyebrow: "01 / OUR PURPOSE",
        missionTitle: "Bringing field observations and agricultural knowledge together.",
        missionDetail: "Sunflower Studio makes plant health information easier to explore. Observe the different parts of a sunflower, compare visible symptoms, and review guidance from a structured expert system.",
        missionNote: "Built with growers, students, and agricultural learners in mind.",
        featuresEyebrow: "02 / WHAT WE OFFER",
        featuresTitle: "Thoughtful tools for real questions.",
        featuresIntro: "Designed to keep useful plant health information approachable, organized, and easy to read.",
        flowEyebrow: "03 / THE PROCESS",
        flowTitle: "From observation to insight.",
        flowIntro: "Three simple steps to explore what may be affecting your sunflowers.",
        flow1: "Observe",
        flow2: "Select",
        flow3: "Review",
        advisoryEyebrow: "USE RESPONSIBLY",
        ctaEyebrow: "START WITH SUNFLOWER STUDIO",
        ctaTitle: "Ready to understand your sunflower better?",
        ctaDescription: "Choose the symptoms you can observe and explore guidance from the expert system.",
      };

  const features = [
    {
      number: "01",
      Icon: Microscope,
      title: t("about.feature1_title"),
      description: t("about.feature1_desc"),
      accent: "bg-[#EAF1E6] dark:bg-[#203A2B]",
      iconColor: "text-[#224D3A] dark:text-[#A5C99D]",
    },
    {
      number: "02",
      Icon: Smartphone,
      title: t("about.feature2_title"),
      description: t("about.feature2_desc"),
      accent: "bg-[#F8EFD7] dark:bg-[#3A3020]",
      iconColor: "text-[#A17625] dark:text-[#F0C66D]",
    },
    {
      number: "03",
      Icon: Languages,
      title: t("about.feature3_title"),
      description: t("about.feature3_desc"),
      accent: "bg-[#E6EFE8] dark:bg-[#1B332A]",
      iconColor: "text-[#2E6650] dark:text-[#A5D7BC]",
    },
  ];

  const steps = [
    { Icon: Search, number: "01", title: copy.flow1, description: t("landing.step1_desc") },
    { Icon: ListChecks, number: "02", title: copy.flow2, description: t("landing.step2_desc") },
    { Icon: FileText, number: "03", title: copy.flow3, description: t("landing.step3_desc") },
  ];

  return (
    <div className="relative isolate space-y-16 pb-4 sm:space-y-20 lg:space-y-24">
      {/* Hero — editorial split composition with a clean botanical photograph. */}
      <section
        aria-labelledby="about-hero-heading"
        className="relative overflow-hidden rounded-[2rem] border border-[#DDE6D9] bg-[#F8F7F1] shadow-[0_20px_70px_-45px_rgba(22,54,33,0.35)] dark:border-white/10 dark:bg-[#13251B]"
      >
        <div className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-[#DCE9D4]/50 blur-3xl dark:bg-[#375641]/30" aria-hidden="true" />
        <div className="grid lg:min-h-[565px] lg:grid-cols-[1.08fr_0.92fr]">
          <div className="relative z-10 flex flex-col justify-center px-7 py-12 sm:px-12 sm:py-16 lg:px-14 lg:py-20">
            <span className="mb-7 inline-flex w-fit items-center gap-2 rounded-full border border-[#C9DBBF] bg-white/80 px-4 py-2 text-xs font-bold tracking-wide text-[#315C43] dark:border-[#87A774]/30 dark:bg-[#1D3627] dark:text-[#B7D5AD]">
              <Sprout size={15} aria-hidden="true" />
              {copy.eyebrow}
            </span>
            <h1
              id="about-hero-heading"
              className={isKhmer
                ? "max-w-xl text-3xl font-bold leading-[1.55] tracking-tight text-[#193D2A] dark:text-[#F5F6ED] sm:text-4xl"
                : "max-w-xl font-serif text-4xl font-semibold leading-[1.13] tracking-tight text-[#193D2A] dark:text-[#F5F6ED] sm:text-5xl lg:text-[3.65rem]"}
            >
              {copy.heroLine1}
              <span className="mt-1 block text-[#618452] dark:text-[#B1CC96]">{copy.heroLine2}</span>
            </h1>
            <p className="mt-6 max-w-lg text-sm leading-7 text-[#4D6253] dark:text-[#C8D6CA] sm:text-base sm:leading-8">
              {copy.heroIntro}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/check"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#224D3A] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#193B2C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#87A774] dark:bg-[#9ABB84] dark:text-[#102116] dark:hover:bg-[#B4D09F]"
              >
                <Leaf size={17} aria-hidden="true" />
                {t("landing.start_checking")}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link
                to="/diseases"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#BBCDB6] bg-white/65 px-6 py-3 text-sm font-semibold text-[#244E37] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#87A774] dark:border-[#668D70] dark:bg-[#1D3627] dark:text-[#D7E5D4] dark:hover:bg-[#274632]"
              >
                <BookOpen size={17} aria-hidden="true" />
                {t("landing.browse_diseases")}
              </Link>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-5 gap-y-3 border-t border-[#DCE7D6] pt-6 dark:border-white/10">
              {[copy.badge1, copy.badge2, copy.badge3].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#55715B] dark:text-[#B7CEB7]">
                  <CheckCircle2 size={14} className="text-[#608A5B] dark:text-[#ACC893]" aria-hidden="true" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative min-h-[340px] overflow-hidden bg-[#486C43] lg:min-h-full">
            <img
              src={sunflowerField}
              alt={isKhmer ? "ទិដ្ឋភាពផ្កាឈូករ័ត្នក្នុងចម្ការ" : "Sunflowers growing in a field"}
              className="absolute inset-0 h-full w-full object-cover object-center"
              loading="eager"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#122B19]/45 via-transparent to-transparent" aria-hidden="true" />
            <div className="absolute bottom-6 left-6 right-6 max-w-xs rounded-2xl border border-white/30 bg-[#F8F7F1]/95 p-4 shadow-lg backdrop-blur-md dark:border-white/15 dark:bg-[#153023]/95 sm:bottom-8 sm:left-8">
              <div className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#5E7F52] dark:text-[#BAD29B]">
                <Leaf size={14} aria-hidden="true" />
                Sunflower Studio
              </div>
              <p className="text-base font-bold leading-snug text-[#1D422C] dark:text-[#F1F6EB]">{copy.photoCaption}</p>
              <p className="mt-1 text-xs leading-5 text-[#657668] dark:text-[#BFD0C1]">{copy.photoDetail}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Purpose — asymmetric editorial section, not repeated hero copy. */}
      <section aria-labelledby="about-mission-heading" className="grid gap-9 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-14">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-[#E8EEE2] p-3 dark:bg-[#1D3325]">
          <img
            src={sunflowerLeaves}
            alt={isKhmer ? "ស្លឹកផ្កាឈូករ័ត្នពណ៌បៃតង" : "Healthy green sunflower foliage"}
            className="h-[255px] w-full rounded-[1.2rem] object-cover sm:h-[325px]"
            loading="lazy"
          />
          <div className="absolute bottom-8 left-8 flex h-12 w-12 items-center justify-center rounded-xl border border-white/50 bg-[#F8F7F1]/90 text-[#224D3A] shadow-md backdrop-blur-sm" aria-hidden="true">
            <Leaf size={25} />
          </div>
        </div>
        <div className="space-y-5">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#84A56F]">{copy.missionEyebrow}</span>
          <h2
            id="about-mission-heading"
            className={isKhmer
              ? "text-2xl font-bold leading-[1.65] text-[#203D2B] dark:text-[#F3F6F3] sm:text-3xl"
              : "font-serif text-3xl font-semibold leading-tight text-[#203D2B] dark:text-[#F3F6F3] sm:text-4xl"}
          >
            {copy.missionTitle}
          </h2>
          <p className="max-w-xl text-sm leading-8 text-[#4A584E] dark:text-[#BDD1C2] sm:text-base">
            {copy.missionDetail}
          </p>
          <div className="flex items-start gap-3 border-l-[3px] border-[#E4AD45] py-2 pl-5">
            <p className="text-sm font-medium leading-7 text-[#486851] dark:text-[#BCD3BE]">{copy.missionNote}</p>
          </div>
        </div>
      </section>

      {/* Features — three consistent, high-contrast, illustrated cards. */}
      <section aria-labelledby="about-features-heading" className="space-y-8">
        <div className="max-w-2xl space-y-3">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#84A56F]">{copy.featuresEyebrow}</span>
          <h2
            id="about-features-heading"
            className={isKhmer
              ? "text-2xl font-bold leading-[1.6] text-[#203D2B] dark:text-[#F3F6F3] sm:text-3xl"
              : "font-serif text-3xl font-semibold leading-tight text-[#203D2B] dark:text-[#F3F6F3] sm:text-4xl"}
          >
            {copy.featuresTitle}
          </h2>
          <p className="text-sm leading-7 text-[#526856] dark:text-[#B8CEBD]">{copy.featuresIntro}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3 lg:gap-5">
          {features.map(({ number, Icon, title, description, accent, iconColor }) => (
            <article
              key={number}
              className="group relative flex min-h-[252px] flex-col rounded-[1.5rem] border border-[#DEE8D9] bg-white p-6 shadow-[0_10px_35px_-26px_rgba(21,55,30,0.35)] transition-transform duration-200 motion-safe:hover:-translate-y-1 dark:border-white/10 dark:bg-[#1A2D21] sm:p-7"
            >
              <div className="mb-8 flex items-start justify-between">
                <span className={"flex h-14 w-14 items-center justify-center rounded-2xl " + accent + " " + iconColor}>
                  <Icon size={26} strokeWidth={1.7} aria-hidden="true" />
                </span>
                <span className="font-mono text-xs font-semibold tracking-[0.2em] text-[#A0B4A0] dark:text-[#819A85]">{number}</span>
              </div>
              <h3 className="text-base font-bold leading-snug text-[#213C2C] dark:text-[#F1F6ED] sm:text-lg">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-[#586E5F] dark:text-[#B9CDBE]">{description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Workflow — a continuous light section with no crossing connector lines. */}
      <section
        aria-labelledby="about-flow-heading"
        className="overflow-hidden rounded-[2rem] border border-[#DDE6D9] bg-[#F0F3EA] px-6 py-10 dark:border-white/10 dark:bg-[#182E21] sm:px-10 sm:py-12 lg:p-14"
      >
        <div className="mb-9 max-w-2xl space-y-3">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#6F9165] dark:text-[#A4C18C]">{copy.flowEyebrow}</span>
          <h2
            id="about-flow-heading"
            className={isKhmer
              ? "text-2xl font-bold leading-[1.6] text-[#203D2B] dark:text-[#F3F6F3] sm:text-3xl"
              : "font-serif text-3xl font-semibold leading-tight text-[#203D2B] dark:text-[#F3F6F3] sm:text-4xl"}
          >
            {copy.flowTitle}
          </h2>
          <p className="text-sm leading-7 text-[#506753] dark:text-[#C1D4C2]">{copy.flowIntro}</p>
        </div>
        <ol className="grid list-none gap-4 p-0 md:grid-cols-3">
          {steps.map(({ number, Icon, title, description }) => (
            <li key={number} className="rounded-2xl border border-[#DEE8D9] bg-white/90 p-6 dark:border-white/10 dark:bg-[#21382A]">
              <div className="mb-5 flex items-center justify-between">
                <span className="font-serif text-3xl font-semibold text-[#8BA974] dark:text-[#BCD79E]">{number}</span>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E9F0E5] text-[#224D3A] dark:bg-[#15291D] dark:text-[#BDD7A5]">
                  <Icon size={20} strokeWidth={1.9} aria-hidden="true" />
                </span>
              </div>
              <h3 className="text-base font-bold text-[#203D2B] dark:text-[#F3F6F3]">{title}</h3>
              <p className="mt-2 text-sm leading-7 text-[#5A6C5E] dark:text-[#C1D4C2]">{description}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Advisory — readable, calm and separate from the promotional CTA. */}
      <section aria-labelledby="about-disclaimer-heading" className="flex flex-col gap-5 rounded-3xl border border-[#E7DDC5] bg-[#FCF8EC] p-7 dark:border-[#857349]/35 dark:bg-[#302D21] sm:flex-row sm:p-9">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F6E7B5] text-[#7F6427] dark:bg-[#4B4128] dark:text-[#F0D18B]">
          <ShieldCheck size={23} aria-hidden="true" />
        </span>
        <div className="space-y-2">
          <span className="text-[0.7rem] font-bold uppercase tracking-[0.17em] text-[#967943] dark:text-[#E2C888]">{copy.advisoryEyebrow}</span>
          <h2 id="about-disclaimer-heading" className="text-lg font-bold text-[#3D422A] dark:text-[#F4EEDC]">
            {t("about.disclaimer_title")}
          </h2>
          <p className="max-w-4xl text-sm leading-7 text-[#62634D] dark:text-[#E1DDCD]">
            {t("about.disclaimer_desc")}
          </p>
        </div>
      </section>

      {/* Final action — don't send visitors back to a modal. */}
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-[#193E2C] px-7 py-11 text-[#F6F7EE] sm:px-12 sm:py-14">
        <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full border-[40px] border-[#87A774]/10" aria-hidden="true" />
        <div className="pointer-events-none absolute bottom-0 right-4 h-48 w-48 rounded-full bg-[#7A994F]/10 blur-3xl" aria-hidden="true" />
        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#BFD29B]">{copy.ctaEyebrow}</span>
            <h2 className={isKhmer ? "text-2xl font-bold leading-[1.6] sm:text-3xl" : "font-serif text-3xl font-semibold leading-tight sm:text-4xl"}>
              {copy.ctaTitle}
            </h2>
            <p className="text-sm leading-7 text-[#D3DFD2]">{copy.ctaDescription}</p>
          </div>
          <Link
            to="/check"
            className="inline-flex min-h-12 w-fit shrink-0 items-center gap-2 rounded-full bg-[#E7BC62] px-6 py-3 text-sm font-bold text-[#193A27] shadow-sm transition-colors hover:bg-[#F3D388] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E7BC62]"
          >
            {t("landing.start_checking")}
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
