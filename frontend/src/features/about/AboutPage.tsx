import type React from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowRight, BookOpen, GraduationCap, Languages, Leaf,
  Microscope, ShieldCheck, Smartphone, Sprout, Users,
} from "lucide-react";
import sunflowerField from "@/assets/images/anatomy/banner-sunflower.jpg";
import sunflowerLeaves from "@/assets/images/anatomy/leaves.jpg";

/** Editorial About page — visual presentation only. */
export function AboutPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const isKhmer = (i18n.resolvedLanguage ?? i18n.language).startsWith("km");
  const copy = isKhmer
    ? {
        eyebrow: "អំពីយើង",
        heading: "អំពី SUNFLOWER STUDIO",
        intro: "Sunflower Studio គឺជាប្រព័ន្ធជំនាញកសិកម្ម ដែលជួយអ្នកប្រើប្រាស់ស្វែងយល់ពីជំងឺផ្កាឈូករ័ត្នដែលអាចកើតមាន តាមរយៈរោគសញ្ញាដែលបានសង្កេតឃើញ។",
        support: "ប្រព័ន្ធនេះផ្តល់ព័ត៌មានងាយយល់ ដើម្បីគាំទ្រការថែទាំដំណាំ និងជួយកសិករ និស្សិត និងអ្នកជំនាញកសិកម្មសម្រេចចិត្តដោយមានព័ត៌មានច្បាស់លាស់។",
        purpose: "គោលបំណងរបស់យើង",
        purposeText: "ធ្វើឱ្យការស្វែងយល់ពីជំងឺផ្កាឈូករ័ត្នកាន់តែងាយស្រួល និងអាចប្រើប្រាស់បានទូលំទូលាយ តាមរយៈប្រព័ន្ធជំនាញផ្អែកលើចំណេះដឹង។",
        what: "អ្វីដែលយើងផ្តល់ជូន",
        symptomTitle: "វិនិច្ឆ័យតាមរោគសញ្ញា",
        symptomDesc: "ជ្រើសរើសរោគសញ្ញាដែលសង្កេតឃើញ ដើម្បីស្វែងរកជំងឺដែលអាចកើតមាន។",
        libraryTitle: "បណ្ណាល័យចំណេះដឹង",
        libraryDesc: "ស្វែងយល់ពីជំងឺផ្កាឈូករ័ត្ន រោគសញ្ញា និងព័ត៌មានគ្រប់គ្រង។",
        bilingualTitle: "គាំទ្រពីរភាសា",
        bilingualDesc: "អាចប្រើប្រាស់ជាភាសាខ្មែរ និងអង់គ្លេស។",
        mobileTitle: "រចនាសម្រាប់ការប្រើប្រាស់ងាយស្រួល",
        mobileDesc: "ចំណុចប្រទាក់ងាយស្រួលប្រើលើទូរស័ព្ទ និងកុំព្យូទ័រ។",
        mission: "បេសកកម្មរបស់យើង",
        missionLead: "ជួយកសិករសម្រេចចិត្តដោយមានព័ត៌មានច្បាស់លាស់ ដើម្បីថែទាំដំណាំផ្កាឈូករ័ត្ន។",
        missionBody: "យើងចង់ភ្ជាប់ចំណេះដឹងកសិកម្មជាមួយការសង្កេតនៅក្នុងចម្ការ តាមរយៈឧបករណ៍ងាយស្រួលប្រើ ដែលគាំទ្រការស្វែងរកបញ្ហាជំងឺដំណាំ និងការគ្រប់គ្រងសមស្រប។",
        audience: "អ្នកណាអាចប្រើប្រាស់បាន?",
        growers: "កសិករដាំផ្កាឈូករ័ត្ន",
        growersDesc: "ពិនិត្យរោគសញ្ញា និងស្វែងយល់ពីការណែនាំថែទាំដំណាំ។",
        students: "និស្សិតកសិកម្ម",
        studentsDesc: "សិក្សាពីជំងឺផ្កាឈូករ័ត្ន និងរោគសញ្ញារបស់វា។",
        experts: "អ្នកជំនាញក្សេត្រសាស្ត្រ និងអ្នកស្រាវជ្រាវ",
        expertsDesc: "ប្រើជាឯកសារយោងសម្រាប់ការសិក្សា និងការគាំទ្រនៅក្នុងចម្ការ។",
        ctaTitle: "ស្វែងយល់ពីសុខភាពផ្កាឈូករ័ត្នថ្ងៃនេះ",
        ctaDesc: "ពិនិត្យរោគសញ្ញា សិក្សាពីជំងឺ និងស្វែងយល់ពីការណែនាំសម្រាប់ការថែទាំដំណាំ។",
        disclaimer: "លទ្ធផលនេះជាព័ត៌មានគាំទ្រការសម្រេចចិត្ត មិនមែនជាការជំនួសការវាយតម្លៃរបស់អ្នកជំនាញកសិកម្មទេ។",
      }
    : {
        eyebrow: "ABOUT US",
        heading: "ABOUT SUNFLOWER STUDIO",
        intro: "Sunflower Studio is an agricultural expert system that helps identify possible sunflower diseases based on observed plant symptoms.",
        support: "It provides practical, easy-to-understand guidance to support healthier sunflower crops and more informed decision-making for growers, students, and agricultural professionals.",
        purpose: "Our Purpose",
        purposeText: "To make sunflower disease identification easier, more accessible, and more reliable through a knowledge-based expert system.",
        what: "What We Do",
        symptomTitle: "Symptom-Based Diagnosis",
        symptomDesc: "Analyze observed plant symptoms to suggest possible diseases.",
        libraryTitle: "Disease Knowledge Library",
        libraryDesc: "Explore sunflower diseases, symptoms, and management information.",
        bilingualTitle: "Bilingual Access",
        bilingualDesc: "Use the platform in Khmer or English.",
        mobileTitle: "Field-Friendly Design",
        mobileDesc: "A simple, responsive interface for desktop and mobile use.",
        mission: "Our Mission",
        missionLead: "Helping growers make more informed decisions for healthier sunflower crops.",
        missionBody: "We aim to bridge the gap between agricultural knowledge and on-field practice by providing an accessible, user-friendly tool that supports early disease investigation and appropriate management options.",
        audience: "Who Can Use It",
        growers: "Sunflower Growers",
        growersDesc: "Identify possible diseases and find practical care guidance.",
        students: "Agricultural Students",
        studentsDesc: "Learn about sunflower diseases and their symptoms.",
        experts: "Agronomists & Researchers",
        expertsDesc: "A reference tool for teaching, extension, and field support.",
        ctaTitle: "Explore Sunflower Health Today",
        ctaDesc: "Check plant symptoms, learn about diseases, and get practical guidance to keep your sunflowers healthy.",
        disclaimer: "Decision-support information only. Confirm important crop interventions with a qualified agricultural professional.",
      };

  const services = [
    { Icon: Microscope, title: copy.symptomTitle, desc: copy.symptomDesc },
    { Icon: BookOpen, title: copy.libraryTitle, desc: copy.libraryDesc },
    { Icon: Languages, title: copy.bilingualTitle, desc: copy.bilingualDesc },
    { Icon: Smartphone, title: copy.mobileTitle, desc: copy.mobileDesc },
  ];
  const audiences = [
    { Icon: Sprout, title: copy.growers, desc: copy.growersDesc },
    { Icon: GraduationCap, title: copy.students, desc: copy.studentsDesc },
    { Icon: Users, title: copy.experts, desc: copy.expertsDesc },
  ];

  return (
    <div className="mx-auto max-w-[1140px] space-y-10 pb-3 text-[#173B2B] dark:text-[#F2F5ED] sm:space-y-12 lg:space-y-14">
      {/* Title outside the photograph, as in the reference. */}
      <header className="pt-3 sm:pt-7">
        <p className="flex items-center gap-3 text-xs font-bold tracking-[0.22em] text-[#456D4E] dark:text-[#B5CCA4]">
          <span className="h-px w-9 bg-[#7B9E67]" aria-hidden="true" />
          {copy.eyebrow}
        </p>
        <h1 className={isKhmer
          ? "mt-5 max-w-5xl text-3xl font-extrabold leading-[1.65] sm:text-4xl"
          : "mt-5 max-w-5xl text-[clamp(2.4rem,5vw,4.5rem)] font-extrabold uppercase leading-[1.06] tracking-[-0.045em]"}>
          {copy.heading}
        </h1>
      </header>

      {/* Clean, landscape sunflower photo, not a page screenshot. */}
      <figure className="m-0 overflow-hidden rounded-2xl bg-[#C9D7BD] dark:bg-[#23392B]">
        <img
          src={sunflowerField}
          alt={isKhmer ? "ចម្ការផ្កាឈូករ័ត្នកំពុងរីក" : "Sunflowers blooming in the field"}
          className="h-[210px] w-full object-cover object-center sm:h-[270px] lg:h-[310px]"
          loading="eager"
          fetchPriority="high"
        />
      </figure>

      {/* Two-column statement, same hierarchy as the reference. */}
      <section className="grid items-start gap-6 md:grid-cols-[1.15fr_0.85fr] md:gap-12" aria-label={copy.eyebrow}>
        <h2 className={isKhmer
          ? "max-w-2xl text-xl font-bold leading-[1.8] sm:text-2xl"
          : "max-w-2xl text-2xl font-bold leading-[1.4] tracking-tight sm:text-3xl"}>
          {copy.intro}
        </h2>
        <p className="border-l border-[#C6D4C2] pl-6 text-sm leading-7 text-[#4D6355] dark:border-[#526B55] dark:text-[#CBDACA] sm:text-base sm:leading-8">
          {copy.support}
        </p>
      </section>

      {/* Editorial three-column section; avoid oversized feature cards. */}
      <section className="grid items-start gap-8 md:grid-cols-[0.92fr_1.12fr_0.9fr] md:gap-8 lg:gap-12" aria-label={copy.what}>
        <div className="space-y-4">
          <h2 className="inline-block border-b-2 border-[#8DAA78] pb-2 text-lg font-bold">{copy.purpose}</h2>
          <p className="max-w-sm text-sm leading-7 text-[#405547] dark:text-[#CDDDCD] sm:text-base">
            {copy.purposeText}
          </p>
        </div>
        <div className="space-y-4">
          <h2 className="inline-block border-b-2 border-[#8DAA78] pb-2 text-lg font-bold">{copy.what}</h2>
          <ul className="space-y-4">
            {services.map(({ Icon, title, desc }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E7EFD9] text-[#2B613F] dark:bg-[#2B4633] dark:text-[#B8D5A4]">
                  <Icon size={19} strokeWidth={1.7} aria-hidden="true" />
                </span>
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold leading-6">{title}</h3>
                  <p className="text-xs leading-5 text-[#597060] dark:text-[#C0D1C0] sm:text-sm">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <img
          src={sunflowerLeaves}
          alt={isKhmer ? "ស្លឹកផ្កាឈូករ័ត្ន" : "Close-up of sunflower leaves"}
          className="aspect-[4/4.2] w-full rounded-2xl object-cover"
          loading="lazy"
        />
      </section>

      {/* Mission and audience: editorial columns instead of more dashboard cards. */}
      <section className="grid gap-10 border-t border-[#E5EADB] pt-9 dark:border-[#3B5441] md:grid-cols-2 md:gap-12">
        <div className="space-y-4">
          <h2 className="inline-block border-b-2 border-[#8DAA78] pb-2 text-lg font-bold">{copy.mission}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <h3 className={isKhmer ? "text-lg font-semibold leading-[1.7]" : "text-xl font-semibold leading-snug tracking-tight sm:text-2xl"}>
              {copy.missionLead}
            </h3>
            <p className="text-sm leading-7 text-[#4D6355] dark:text-[#CDDDCD]">{copy.missionBody}</p>
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="inline-block border-b-2 border-[#8DAA78] pb-2 text-lg font-bold">{copy.audience}</h2>
          <ul className="space-y-4">
            {audiences.map(({ Icon, title, desc }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E7EFD9] text-[#2B613F] dark:bg-[#2B4633] dark:text-[#B8D5A4]">
                  <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-sm font-bold">{title}</h3>
                  <p className="mt-1 text-xs leading-5 text-[#597060] dark:text-[#C0D1C0] sm:text-sm">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Soft cream-and-sage CTA like the design reference. */}
      <section className="relative isolate overflow-hidden rounded-[2rem] border border-[#E1E8D5] bg-[#F1F4E7] px-6 py-14 text-center dark:border-[#46664A] dark:bg-[#20382A] sm:px-12 sm:py-20">
        <img
          src={sunflowerField}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover object-center opacity-20 dark:opacity-10"
          loading="lazy"
        />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-[#F1F4E7]/80 via-[#F6F7EE]/95 to-[#F1F4E7]/80 dark:from-[#20382A]/95 dark:via-[#20382A]/95 dark:to-[#20382A]/95" aria-hidden="true" />
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="flex items-center justify-center gap-4 text-[#578461] dark:text-[#C4D8B4]" aria-hidden="true">
            <span className="h-px w-12 bg-[#9DB992]" />
            <Leaf size={21} strokeWidth={1.6} />
            <span className="h-px w-12 bg-[#9DB992]" />
          </div>
          <h2 className={isKhmer ? "text-2xl font-bold leading-[1.7] sm:text-3xl" : "text-3xl font-bold tracking-tight sm:text-4xl"}>{copy.ctaTitle}</h2>
          <p className="mx-auto max-w-xl text-sm leading-7 text-[#4B6250] dark:text-[#D0DEC8] sm:text-base">{copy.ctaDesc}</p>
          <div className="flex flex-wrap justify-center gap-3 pt-3">
            <Link
              to="/check"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#214C33] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#173B28] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#87A774] dark:bg-[#B2D29A] dark:text-[#132C1A]"
            >
              <Microscope size={17} aria-hidden="true" />
              {t("nav.check")}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link
              to="/diseases"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#315C42] bg-white/85 px-6 py-3 text-sm font-semibold text-[#214C33] transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#87A774] dark:border-[#799F82] dark:bg-[#152B1E] dark:text-[#DFECDD]"
            >
              <BookOpen size={18} aria-hidden="true" />
              {t("nav.diseases")}
            </Link>
          </div>
          <p className="flex items-start justify-center gap-1.5 pt-3 text-xs leading-5 text-[#647965] dark:text-[#BBD1B9]">
            <ShieldCheck className="mt-0.5 shrink-0" size={15} aria-hidden="true" />
            {copy.disclaimer}
          </p>
        </div>
      </section>
    </div>
  );
}
