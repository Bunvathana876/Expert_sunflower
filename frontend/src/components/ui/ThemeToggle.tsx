import type React from "react";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle(): React.JSX.Element {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("sf-theme");
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.setAttribute("data-theme", "dark");
      localStorage.setItem("sf-theme", "dark");
    } else {
      root.setAttribute("data-theme", "light");
      localStorage.setItem("sf-theme", "light");
    }
  }, [isDark]);

  return (
    <button
      type="button"
      onClick={() => setIsDark((prev) => !prev)}
      className="inline-flex items-center justify-center p-2 rounded-xl text-xs font-semibold border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-bg-subtle)] transition-all duration-150 cursor-pointer shadow-2xs"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? (
        <Sun size={15} className="text-[#E4AD45]" aria-hidden="true" />
      ) : (
        <Moon size={15} className="text-[var(--color-text-secondary)]" aria-hidden="true" />
      )}
    </button>
  );
}
