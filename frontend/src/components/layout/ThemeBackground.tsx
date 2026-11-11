import type React from "react";

/**
 * ThemeBackground Component — Modern Botanical Science
 *
 * Implements a clean, cozy, warm botanical parchment ambient background
 * with subtle sage (#87A774) and sunflower (#E4AD45) radial washes.
 * Ensures zero lag, high contrast, and a sophisticated botanical aesthetic.
 */
export function ThemeBackground(): React.JSX.Element {
  return (
    <div
      className="fixed inset-0 pointer-events-none -z-50 overflow-hidden select-none bg-[var(--color-bg)] transition-colors duration-500 ease-out"
      aria-hidden="true"
    >
      {/* Top-right Sage Botanical Ambient Wash */}
      <div
        className="absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full opacity-60 dark:opacity-20 blur-3xl pointer-events-none transition-opacity duration-700"
        style={{
          background:
            "radial-gradient(circle, rgba(135, 167, 116, 0.18) 0%, rgba(135, 167, 116, 0.04) 60%, transparent 80%)",
        }}
      />

      {/* Bottom-left Sunflower Warmth Wash */}
      <div
        className="absolute -bottom-36 -left-36 w-[560px] h-[560px] rounded-full opacity-45 dark:opacity-15 blur-3xl pointer-events-none transition-opacity duration-700"
        style={{
          background:
            "radial-gradient(circle, rgba(228, 173, 69, 0.16) 0%, rgba(228, 173, 69, 0.03) 60%, transparent 80%)",
        }}
      />

      {/* Center Subtle Forest Green Depth Tint */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full opacity-30 dark:opacity-25 blur-[100px] pointer-events-none transition-opacity duration-700"
        style={{
          background:
            "radial-gradient(ellipse, rgba(34, 77, 58, 0.06) 0%, transparent 70%)",
        }}
      />

      {/* Micro Botanical Paper Texture (SVG noise pattern for cozy parchment feel) */}
      <div
        className="absolute inset-0 opacity-[0.025] dark:opacity-[0.015] pointer-events-none mix-blend-multiply dark:mix-blend-screen"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
