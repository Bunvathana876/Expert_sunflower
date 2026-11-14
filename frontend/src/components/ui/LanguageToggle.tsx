import type React from "react";
import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";

/**
 * Modern Botanical Language Toggle (EN / ខ្មែរ).
 * Switches the i18next locale and mirrors it onto <html lang="...">.
 */
export function LanguageToggle(): React.JSX.Element {
  const { i18n } = useTranslation();

  const isKhmer = i18n.language === "km";

  const toggle = () => {
    void i18n.changeLanguage(isKhmer ? "en" : "km");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-bg-subtle)] transition-all duration-150 cursor-pointer shadow-2xs"
      aria-label={isKhmer ? "Switch to English" : "ប្ដូរទៅភាសាខ្មែរ"}
      title={isKhmer ? "Switch to English" : "ប្ដូរទៅភាសាខ្មែរ"}
    >
      <Languages size={14} className="text-[var(--color-secondary)] shrink-0" aria-hidden="true" />
      <span className="tracking-wide">{isKhmer ? "EN" : "ខ្មែរ"}</span>
    </button>
  );
}
