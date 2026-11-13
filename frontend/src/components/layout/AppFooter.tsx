import type React from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Stethoscope,
  BookOpen,
  GitCompare,
  Clock,
  Info,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Leaf,
} from "lucide-react";

interface AppFooterProps {
  onOpenAbout?: () => void;
}

export function AppFooter({ onOpenAbout }: AppFooterProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const isKhmer = i18n.language === "km";

  return (
    <footer className="w-full border-t border-[var(--color-border)] bg-[var(--color-bg-card)]/90 backdrop-blur-md text-[var(--color-text)] transition-colors mt-auto">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 sm:py-14 space-y-8">

        {/* ── Top Grid ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">

          {/* Brand column (5 cols) */}
          <div className="md:col-span-5 space-y-5">
            <Link to="/" className="inline-flex items-center gap-3 group" aria-label="Sunflower Studio home">
              <div className="w-9 h-9 rounded-xl bg-[var(--color-primary-subtle)] border border-[var(--color-secondary)]/25 flex items-center justify-center shrink-0 motion-safe:transition-transform group-hover:scale-105">
                <Leaf size={17} className="text-[var(--color-primary)]" aria-hidden="true" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-extrabold text-base tracking-tight text-[var(--color-primary)] dark:text-[var(--color-text)]">
                  Sunflower Studio
                </span>
                <span className="text-[0.62rem] font-bold text-[var(--color-secondary)] uppercase tracking-widest mt-0.5">
                  {isKhmer ? "វេទិការោគវិនិច្ឆ័យកសិកម្ម" : "Botanical Science Platform"}
                </span>
              </div>
            </Link>

            <p className="text-xs sm:text-[0.825rem] text-[var(--color-text-secondary)] leading-[1.75] max-w-sm">
              {isKhmer
                ? "វេទិកាធ្វើរោគវិនិច្ឆ័យជំងឺដំណាំផ្កាឈូករ័ត្នបែបទំនើប សម្រាប់កសិករ អ្នកជំនាញក្សេត្រសាស្ត្រ និងមន្ត្រីផ្សព្វផ្សាយកសិកម្មនៅកម្ពុជា។"
                : "Modern agricultural disease diagnosis and crop-protection platform, empowering Cambodian sunflower growers, agronomists, and researchers with rapid, evidence-based pathogen identification."}
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-primary-subtle)] border border-[var(--color-secondary)]/25 text-xs font-semibold text-[var(--color-primary)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-secondary)] animate-pulse shrink-0" aria-hidden="true" />
              <span>
                {isKhmer ? "ប្រព័ន្ធវិនិច្ឆ័យដំណើរការ" : "Diagnostic Engine Active"}
              </span>
            </div>
          </div>

          {/* Diagnostic tools (3 cols) */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-[0.68rem] font-bold text-[var(--color-text)] uppercase tracking-widest">
              {isKhmer ? "ឧបករណ៍វិនិច្ឆ័យ" : "Diagnostic Suite"}
            </h4>
            <ul className="space-y-2.5">
              {[
                { to: "/check", icon: Stethoscope, label: t("nav.check") },
                { to: "/diseases", icon: BookOpen, label: t("nav.diseases") },
                {
                  to: "/diseases/compare",
                  icon: GitCompare,
                  label: isKhmer ? "ប្រៀបធៀបជំងឺ" : "Compare Pathogens",
                },
                { to: "/history", icon: Clock, label: t("nav.history") },
              ].map(({ to, icon: Icon, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] flex items-center gap-2 text-xs sm:text-[0.825rem] motion-safe:transition-colors group focus-visible:outline-none focus-visible:underline"
                  >
                    <Icon
                      size={13}
                      className="text-[var(--color-secondary)] shrink-0 group-hover:text-[var(--color-primary)] motion-safe:transition-colors"
                      aria-hidden="true"
                    />
                    <span>{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Platform & support (4 cols) */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-[0.68rem] font-bold text-[var(--color-text)] uppercase tracking-widest">
              {isKhmer ? "ព័ត៌មានប្រព័ន្ធ" : "Platform & Support"}
            </h4>
            <ul className="space-y-2.5">
              {onOpenAbout && (
                <li>
                  <button
                    type="button"
                    onClick={onOpenAbout}
                    className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] flex items-center gap-2 text-xs sm:text-[0.825rem] motion-safe:transition-colors group text-left focus-visible:outline-none focus-visible:underline"
                  >
                    <Info
                      size={13}
                      className="text-[var(--color-secondary)] shrink-0 group-hover:text-[var(--color-primary)] motion-safe:transition-colors"
                      aria-hidden="true"
                    />
                    <span>{t("nav.about")}</span>
                  </button>
                </li>
              )}
              <li>
                <Link
                  to="/feedback"
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] flex items-center gap-2 text-xs sm:text-[0.825rem] motion-safe:transition-colors group focus-visible:outline-none focus-visible:underline"
                >
                  <MessageSquare
                    size={13}
                    className="text-[var(--color-secondary)] shrink-0 group-hover:text-[var(--color-primary)] motion-safe:transition-colors"
                    aria-hidden="true"
                  />
                  <span>{isKhmer ? "មតិកែលម្អ" : "Grower Feedback"}</span>
                </Link>
              </li>
            </ul>

            {/* Capability badges */}
            <div className="pt-2 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[0.7rem] text-[var(--color-text-muted)]">
                <CheckCircle2 size={12} className="text-[var(--color-secondary)] shrink-0" aria-hidden="true" />
                <span>{isKhmer ? "PWA ក្រៅបណ្តាញ" : "Offline Field PWA Enabled"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[0.7rem] text-[var(--color-text-muted)]">
                <ShieldCheck size={12} className="text-[var(--color-secondary)] shrink-0" aria-hidden="true" />
                <span>{isKhmer ? "ម៉ាស៊ីន Bayesian" : "Bayesian Rule Engine"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Advisory notice ──────────────────────────────── */}
        <div className="p-4 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] text-[0.72rem] leading-relaxed text-[var(--color-text-secondary)] flex items-start gap-2.5">
          <ShieldCheck
            size={15}
            className="text-[var(--color-primary)] dark:text-[var(--color-secondary)] shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <p>
            <strong className="text-[var(--color-text)]">
              {isKhmer ? "សេចក្តីជូនដំណឹង៖" : "Advisory Notice:"}
            </strong>{" "}
            {isKhmer
              ? "Sunflower Studio ផ្តល់ជំនួយការសម្រេចចិត្តផ្អែកលើរោគសញ្ញា។ សម្រាប់ការផ្ទុះជំងឺធ្ងន់ ឬប្រើថ្នាំទ្រង់ទ្រាយធំ សូមពិគ្រោះជាមួយអ្នកជំនាញ។"
              : "Sunflower Studio provides decision-support based on visible symptoms. For widespread outbreaks or large-scale treatments, verify with your local agricultural extension service."}
          </p>
        </div>

        {/* ── Bottom bar ───────────────────────────────────── */}
        <div className="pt-4 border-t border-[var(--color-border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-2 text-[0.7rem] text-[var(--color-text-muted)]">
          <p>
            &copy; {new Date().getFullYear()}{" "}
            <strong className="text-[var(--color-text-secondary)]">Sunflower Studio</strong>.{" "}
            {isKhmer ? "រក្សាសិទ្ធិគ្រប់យ៉ាង។" : "All rights reserved."}
          </p>
          <div className="flex items-center gap-2.5">
            <span>{isKhmer ? "ភាសាខ្មែរ & English" : "Khmer / English"}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-[0.65rem]">v1.0.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
