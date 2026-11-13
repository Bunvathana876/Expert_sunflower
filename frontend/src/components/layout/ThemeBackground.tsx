import type React from "react";
import bgLight from "@/assets/images/sunflower-website-background-lightMode.jpg";
import bgDark from "@/assets/images/sunflower-website-background-darkMode.jpeg";

/**
 * ThemeBackground Component — Sunflower Studio
 *
 * Implements a responsive, theme-aware blurred background:
 * - Light Mode: sunflower-website-background-lightMode.jpg
 * - Dark Mode: sunflower-website-background-darkMode.jpeg
 *
 * Features:
 * - Edge-to-edge Gaussian blur without boundary fringing (-inset-10 with scale-110).
 * - Smooth 700ms cross-fading when toggling between light and dark mode.
 * - Soft ambient tint overlay guaranteeing WCAG-compliant contrast and crisp text readability.
 * - Hardware-accelerated GPU filters with zero scroll lag.
 */
export function ThemeBackground(): React.JSX.Element {
  return (
    <div
      className="fixed inset-0 pointer-events-none -z-50 overflow-hidden select-none bg-[var(--color-bg)] transition-colors duration-500 ease-out"
      aria-hidden="true"
    >
      {/* Blurred Sunflower Background Layer */}
      <div className="absolute -inset-10 overflow-hidden pointer-events-none">
        {/* Light Mode Sunflower Background */}
        <img
          src={bgLight}
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover object-center filter blur-xl scale-110 transition-opacity duration-700 ease-in-out opacity-85 dark:opacity-0 pointer-events-none select-none will-change-[opacity]"
        />

        {/* Dark Mode Sunflower Background */}
        <img
          src={bgDark}
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover object-center filter blur-xl scale-110 transition-opacity duration-700 ease-in-out opacity-0 dark:opacity-85 pointer-events-none select-none will-change-[opacity]"
        />
      </div>

      {/* Ambient Theme Tint Overlay for Content Contrast & Readability */}
      <div className="absolute inset-0 bg-[#F8F7F1]/30 dark:bg-[#0E1712]/50 backdrop-blur-[1px] pointer-events-none transition-colors duration-500" />

      {/* Subtle Botanical Warmth Accents */}
      <div
        className="absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full opacity-40 dark:opacity-20 blur-3xl pointer-events-none transition-opacity duration-700"
        style={{
          background:
            "radial-gradient(circle, rgba(135, 167, 116, 0.18) 0%, rgba(135, 167, 116, 0.04) 60%, transparent 80%)",
        }}
      />

      <div
        className="absolute -bottom-36 -left-36 w-[560px] h-[560px] rounded-full opacity-35 dark:opacity-15 blur-3xl pointer-events-none transition-opacity duration-700"
        style={{
          background:
            "radial-gradient(circle, rgba(228, 173, 69, 0.14) 0%, rgba(228, 173, 69, 0.02) 60%, transparent 80%)",
        }}
      />

      {/* Micro Botanical Paper Texture */}
      <div
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.015] pointer-events-none mix-blend-multiply dark:mix-blend-screen"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
