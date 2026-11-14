import type React from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, BookOpen, FileText, Languages, Leaf, ListChecks, Microscope, Search, ShieldCheck, Smartphone, Sprout } from "lucide-react";
import heroSunflowerBloom from "@/assets/images/anatomy/hero-sunflower-bloom.jpg";

export function AboutPage(): React.JSX.Element {
  const { t } = useTranslation();
  const features = [
    { Icon: Microscope, title: t("about.feature1_title"), description: t("about.feature1_desc") },
    { Icon: Smartphone, title: t("about.feature2_title"), description: t("about.feature2_desc") },
    { Icon: Languages, title: t("about.feature3_title"), description: t("about.feature3_desc") },
  ];
  const steps = [
    { Icon: Search, title: t("landing.step1_title"), description: t("landing.step1_desc") },
    { Icon: ListChecks, title: t("landing.step2_title"), description: t("landing.step2_desc") },
    { Icon: FileText, title: t("landing.step3_title"), description: t("landing.step3_desc") },
  ];
  return (
    <div className="space-y-14 sm:space-y-20 pb-6">
      <section className="grid min-h-[380px] grid-cols-1 overflow-hidden rounded-3xl border border-stone-200/80 bg-[#F8F7F1] shadow-sm dark:border-white/10 dark:bg-[#14251B] lg:grid-cols-2">
        <div className="flex flex-col justify-center gap-5 px-6 py-12 sm:px-10 lg:px-12 lg:py-16">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#87A774]/40 bg-[#EDF5EE] px-4 py-2 text-xs font-semibold text-[#224D3A] dark:bg-[#203A2A] dark:text-[#B8D5AE]">
            <Sprout size={15} aria-hidden="true" /> Sunflower Studio
          </span>
          <div className="space-y-3">
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-[#1B3B2B] dark:text-[#F3F6F3] sm:text-4xl lg:text-5xl">{t("about.title")}</h1>
            <p className="text-base font-semibold text-[#496D55] dark:text-[#B8D5AE]">{t("about.subtitle")}</p>
          </div>
          <p className="max-w-xl text-sm leading-8 text-[#4A584E] dark:text-[#C5D6C8] sm:text-base">{t("about.description")}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/check" className="inline-flex items-center gap-2 rounded-full bg-[#224D3A] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#193B2C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#87A774] dark:bg-[#87A774] dark:text-[#0E1712]">
              <Leaf size={17} aria-hidden="true" />{t("landing.start_checking")}<ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link to="/diseases" className="inline-flex items-center gap-2 rounded-full border border-[#87A774]/50 px-6 py-3 text-sm font-semibold text-[#224D3A] transition-colors hover:bg-[#E9F2E7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#87A774] dark:text-[#D7E8D8] dark:hover:bg-[#243B2B]">
              <BookOpen size={17} aria-hidden="true" />{t("landing.browse_diseases")}
            </Link>
          </div>
        </div>
        <div className="relative min-h-[270px] lg:min-h-full">
          <img src={heroSunflowerBloom} alt="" className="absolute inset-0 h-full w-full object-cover object-center" loading="lazy" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#14251B]/15 to-transparent" aria-hidden="true" />
        </div>
      </section>
      <section aria-labelledby="about-features-heading" className="space-y-7">
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <h2 id="about-features-heading" className="text-2xl font-extrabold text-[#1B3B2B] dark:text-[#F3F6F3] sm:text-3xl">{t("about.subtitle")}</h2>
          <p className="text-sm leading-7 text-[#4A584E] dark:text-[#B5C9BC]">{t("about.description")}</p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {features.map(({ Icon, title, description }) => (
            <article key={title} className="flex h-full flex-col gap-4 rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#192720] sm:p-7">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EDF5EE] text-[#224D3A] dark:bg-[#0F2018] dark:text-[#A7CA98]"><Icon size={23} aria-hidden="true" /></div>
              <h3 className="text-lg font-bold leading-snug text-[#1B3B2B] dark:text-[#EFF5EF]">{title}</h3>
              <p className="text-sm leading-7 text-[#4A584E] dark:text-[#B5C9BC]">{description}</p>
            </article>
          ))}
        </div>
      </section>
      <section aria-labelledby="about-process-heading" className="space-y-7">
        <div className="text-center">
          <h2 id="about-process-heading" className="text-2xl font-extrabold text-[#1B3B2B] dark:text-[#F3F6F3] sm:text-3xl">{t("landing.how_it_works_title")}</h2>
          <p className="mt-2 text-sm text-[#4A584E] dark:text-[#B5C9BC]">{t("landing.how_it_works_subtitle")}</p>
        </div>
        <ol className="grid list-none gap-5 p-0 md:grid-cols-3">
          {steps.map(({ Icon, title, description }, index) => (
            <li key={index} className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#192720]">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#224D3A] font-bold text-white dark:bg-[#87A774] dark:text-[#0E1712]">{index + 1}</span>
                <Icon size={22} className="text-[#224D3A] dark:text-[#B8D5AE]" aria-hidden="true" />
              </div>
              <h3 className="mb-2 text-base font-bold text-[#1B3B2B] dark:text-[#EFF5EF]">{title}</h3>
              <p className="text-sm leading-7 text-[#4A584E] dark:text-[#B5C9BC]">{description}</p>
            </li>
          ))}
        </ol>
      </section>
      <section aria-labelledby="about-disclaimer-heading" className="rounded-3xl border border-[#87A774]/25 bg-[#EAF1E7] p-6 dark:border-[#87A774]/20 dark:bg-[#1A3022] sm:p-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-[#224D3A] dark:bg-[#102015] dark:text-[#B8D5AE]"><ShieldCheck size={24} aria-hidden="true" /></span>
          <div className="space-y-2">
            <h2 id="about-disclaimer-heading" className="text-xl font-bold text-[#1B3B2B] dark:text-[#F3F6F3]">{t("about.disclaimer_title")}</h2>
            <p className="text-sm leading-8 text-[#3D5846] dark:text-[#C5D6C8]">{t("about.disclaimer_desc")}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
