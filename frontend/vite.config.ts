import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

declare module "vite" {
  interface UserConfig {
    test?: Record<string, unknown>;
  }
}

const COMMON_SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
};

const DEV_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'report-sample'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: http://localhost:8000 http://127.0.0.1:8000 https:",
  "connect-src 'self' http://localhost:8000 http://127.0.0.1:8000 ws://localhost:5174 ws://127.0.0.1:5174",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const PREVIEW_CSP = [
  "default-src 'self'",
  "script-src 'self' 'report-sample'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: http://localhost:8000 http://127.0.0.1:8000 https:",
  "connect-src 'self' http://localhost:8000 http://127.0.0.1:8000",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico",
        "robots.txt",
        "apple-touch-icon.png",
      ],
      manifest: {
        name: "Sunflower Expert System",
        short_name: "Sunflower AI",
        description: "Bilingual AI Expert System for Sunflower Disease Diagnosis and Care",
        theme_color: "#1A2411",
        background_color: "#1A2411",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/icons/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icons/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,json,woff,woff2}"],
        // Defer heavy on-demand PDF & admin-chart bundles out of eager SW install precache
        // so grower mobile startup stays fast; runtime CacheFirst caches them once used.
        globIgnores: [
          "**/vendor-charts-*.js",
          "**/OverviewChartsSection-*.js",
          "**/DiagnosticReportModal-*.js",
          "**/jspdf*.js",
          "**/html2canvas*.js",
          "**/index.es-*.js",
          "**/purify.es-*.js",
        ],
        runtimeCaching: [
          // 0. Cache hashed immutable Vite JS/CSS chunks on first use (CacheFirst)
          {
            urlPattern: /\/assets\/.*\.(?:js|css)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "hashed-static-assets-cache",
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 Year (content-hashed)
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // 1. Specifically Cache i18next Translation JSON Dictionaries
          {
            urlPattern: /.*\/locales\/.*\.json$/,
            handler: "CacheFirst",
            options: {
              cacheName: "i18n-locales-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 Days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // 2. Cache Symptom & Disease Definitions (StaleWhileRevalidate for offline diagnosis)
          {
            urlPattern: /\/api\/v1\/(symptoms|diseases).*/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "api-definitions-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 Days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // 3. Cache Botanical & Media Images
          {
            urlPattern: /\/media\/.*\.(?:png|jpg|jpeg|svg|webp)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "media-images-cache",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 Days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }
          if (
            id.includes("/node_modules/recharts/") ||
            id.includes("/node_modules/d3-") ||
            id.includes("/node_modules/victory-vendor/")
          ) {
            return "vendor-charts";
          }
          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/") ||
            id.includes("/node_modules/react-router/") ||
            id.includes("/node_modules/scheduler/")
          ) {
            return "vendor-react";
          }
          if (id.includes("/node_modules/@tanstack/")) {
            return "vendor-query";
          }
          if (
            id.includes("/node_modules/i18next") ||
            id.includes("/node_modules/react-i18next/")
          ) {
            return "vendor-i18n";
          }
          if (
            id.includes("/node_modules/react-hook-form/") ||
            id.includes("/node_modules/@hookform/") ||
            id.includes("/node_modules/zod/")
          ) {
            return "vendor-forms";
          }
          if (id.includes("/node_modules/lucide-react/")) {
            return "vendor-icons";
          }
          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    host: "0.0.0.0",
    port: 5174,
    headers: {
      ...COMMON_SECURITY_HEADERS,
      "Content-Security-Policy": DEV_CSP,
    },
    watch: {
      usePolling: true,
    },
    // The app talks to the API through /api/v1 in dev, so cookies are same-origin
    // and the refresh-token cookie works without SameSite headaches.
    proxy: {
      "/api": { target: process.env.VITE_PROXY_TARGET || "http://127.0.0.1:8000", changeOrigin: true },
      "/media": { target: process.env.VITE_PROXY_TARGET || "http://127.0.0.1:8000", changeOrigin: true },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    headers: {
      ...COMMON_SECURITY_HEADERS,
      "Content-Security-Policy": PREVIEW_CSP,
    },
    proxy: {
      "/api": { target: process.env.VITE_PROXY_TARGET || "http://127.0.0.1:8000", changeOrigin: true },
      "/media": { target: process.env.VITE_PROXY_TARGET || "http://127.0.0.1:8000", changeOrigin: true },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
  },
});
