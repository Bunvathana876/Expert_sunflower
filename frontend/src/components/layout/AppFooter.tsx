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
} from "lucide-react";

interface AppFooterProps {
  onOpenAbout?: () => void;
}

export function AppFooter({ onOpenAbout }: AppFooterProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const isKhmer = i18n.language === "km";

  return (
    <footer className="w-full border-t border-[var(--color-border)] bg-[var(--color-bg-card)]/80 backdrop-blur-md text-[var(--color-text)] transition-colors mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-10">
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
          {/* Brand & Mission (5 cols) */}
          <div className="md:col-span-5 space-y-4">
            <Link to="/" className="inline-flex items-center gap-2.5 group">
              <span className="text-2xl transition-transform group-hover:scale-105" aria-hidden="true">
                🌻
              </span>
              <div className="flex flex-col">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-[var(--color-primary)] dark:text-[var(--color-text)] leading-tight">
                  Sunflower Studio
                </span>
                <span className="text-[0.65rem] font-bold text-[var(--color-secondary)] uppercase tracking-wider">
                  {isKhmer ? "វេទិការោគវិនិច្ឆ័យកសិកម្ម" : "Botanical Science Platform"}
                </span>
              </div>
            </Link>

            <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed max-w-sm">
              {isKhmer
                ? "វេទិកាធ្វើរោគវិនិច្ឆ័យជំងឺដំណាំផ្កាឈូករ័ត្នបែបទំនើប សម្រាប់កសិករ អ្នកជំនាញក្សេត្រសាស្ត្រ និងមន្ត្រីផ្សព្វផ្សាយកសិកម្មនៅកម្ពុជា។"
                : "Modern agricultural disease diagnosis and crop protection platform empowering Cambodian sunflower growers, agronomists, and researchers with rapid, evidence-based pathogen identification."}
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-primary-subtle)] border border-[var(--color-secondary)]/30 text-xs font-semibold text-[var(--color-primary)] dark:text-[var(--color-primary)]">
              <span className="w-2 h-2 rounded-full bg-[var(--color-secondary)] animate-pulse" />
              <span>
                {isKhmer ? "ប្រព័ន្ធវិនិច្ឆ័យដំណើរការធម្មតា" : "Diagnostic Inference Engine Active"}
              </span>
            </div>
          </div>

          {/* Diagnostic Tools (3 cols) */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider font-mono">
              {isKhmer ? "ឧបករណ៍វិនិច្ឆ័យ" : "Diagnostic Suite"}
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <Link
                  to="/check"
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] flex items-center gap-1.5 transition-colors"
                >
                  <Stethoscope size={14} className="text-[var(--color-secondary)]" />
                  <span>{t("nav.check")}</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/diseases"
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] flex items-center gap-1.5 transition-colors"
                >
                  <BookOpen size={14} className="text-[var(--color-secondary)]" />
                  <span>{t("nav.diseases")}</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/diseases/compare"
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] flex items-center gap-1.5 transition-colors"
                >
                  <GitCompare size={14} className="text-[var(--color-secondary)]" />
                  <span>{isKhmer ? "ប្រៀបធៀបជំងឺ" : "Compare Pathogens"}</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/history"
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] flex items-center gap-1.5 transition-colors"
                >
                  <Clock size={14} className="text-[var(--color-secondary)]" />
                  <span>{t("nav.history")}</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform & Support (4 cols) */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider font-mono">
              {isKhmer ? "ព័ត៌មានប្រព័ន្ធ & ជំនួយ" : "Platform & Agronomy"}
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              {onOpenAbout && (
                <li>
                  <button
                    type="button"
                    onClick={onOpenAbout}
                    className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] flex items-center gap-1.5 transition-colors text-left"
                  >
                    <Info size={14} className="text-[var(--color-secondary)]" />
                    <span>{t("nav.about")}</span>
                  </button>
                </li>
              )}
              <li>
                <Link
                  to="/feedback"
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] flex items-center gap-1.5 transition-colors"
                >
                  <MessageSquare size={14} className="text-[var(--color-secondary)]" />
                  <span>{isKhmer ? "មតិកែលម្អកសិករ" : "Grower Field Feedback"}</span>
                </Link>
              </li>
              <li className="flex items-center gap-1.5 text-[var(--color-text-muted)] text-xs pt-1">
                <CheckCircle2 size={13} className="text-[var(--color-secondary)] shrink-0" />
                <span>
                  {isKhmer
                    ? "គាំទ្រដំណើរការក្រៅបណ្តាញ (PWA Offline Mode)"
                    : "Offline Field PWA Enabled"}
                </span>
              </li>
              <li className="flex items-center gap-1.5 text-[var(--color-text-muted)] text-xs">
                <ShieldCheck size={13} className="text-[var(--color-secondary)] shrink-0" />
                <span>
                  {isKhmer
                    ? "ការវិភាគផ្អែកលើច្បាប់ក្សេត្រសាស្ត្រ Bayesian"
                    : "Bayesian Agricultural Rule Engine"}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Advisory Notice */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-xs leading-relaxed text-[var(--color-text-secondary)] flex items-start gap-2.5">
          <ShieldCheck size={16} className="text-[var(--color-primary)] dark:text-[var(--color-secondary)] shrink-0 mt-0.5" />
          <p>
            <strong>{isKhmer ? "សេចក្តីជូនដំណឹងគាំទ្រការសម្រេចចិត្ត៖" : "Clinical Agronomy Notice:"}</strong>{" "}
            {isKhmer
              ? "Sunflower Studio ផ្តល់នូវជំនួយការសម្រេចចិត្តផ្អែកលើរោគសញ្ញាដែលបានសង្កេតឃើញនៅក្នុងចំការ។ សម្រាប់ជំងឺរាតត្បាតធ្ងន់ធ្ងរ ឬការប្រើប្រាស់ថ្នាំកសិកម្មទ្រង់ទ្រាយធំ សូមពិគ្រោះជាមួយមន្ត្រីកសិកម្មស្រុក ឬអ្នកជំនាញការពារដំណាំ។"
              : "Sunflower Studio provides decision-support guidance based on visible crop symptom indicators. For widespread outbreaks or heavy fungicide treatments, always verify with your local agricultural extension service."}
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-[var(--color-border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--color-text-muted)]">
          <p>
            © {new Date().getFullYear()} <strong>Sunflower Studio</strong>.{" "}
            {isKhmer ? "រក្សាសិទ្ធិគ្រប់យ៉ាង។" : "All rights reserved."}
          </p>
          <div className="flex items-center gap-3">
            <span>
              {isKhmer ? "ភាសាខ្មែរ & English" : "Bilingual (Khmer / English)"}
            </span>
            <span aria-hidden="true">•</span>
            <span className="font-mono text-[0.7rem]">v1.0.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
