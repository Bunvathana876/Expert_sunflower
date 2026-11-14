import type React from "react";
import { Suspense, lazy } from "react";
import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Home,
  BookOpen,
  Stethoscope,
  Clock,
  Info,
  LogOut,
  LogIn,
  LayoutDashboard,
} from "lucide-react";
import { useAuth } from "@/features/auth";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { BottomNav } from "./BottomNav";
import { AppFooter } from "./AppFooter";
import { ThemeBackground } from "./ThemeBackground";
import { OfflineBanner } from "@/components/ui/OfflineBanner";

const LazyAIChatWidget = lazy(() =>
  import("@/features/ai-assistant").then((m) => ({ default: m.AIChatWidget })),
);

interface NavItem {
  to: string;
  labelKey: string;
  icon: typeof Home;
  requireAuth?: boolean;
  requirePermission?: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", labelKey: "nav.home", icon: Home },
  { to: "/check", labelKey: "nav.check", icon: Stethoscope },
  { to: "/diseases", labelKey: "nav.diseases", icon: BookOpen },
  { to: "/history", labelKey: "nav.history", icon: Clock, requireAuth: true },
  {
    to: "/admin",
    labelKey: "nav.dashboard",
    icon: LayoutDashboard,
    requireAuth: true,
    requirePermission: "analytics:read",
  },
];

/**
 * Main application layout with botanical header, responsive navigation, and footer.
 */
export function AppLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, logout, user, hasPermission } = useAuth();
  const location = useLocation();
  const isKhmer = i18n.language === "km";

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const visibleNav = NAV_ITEMS.filter((item) => {
    if (item.requireAuth && !isAuthenticated) return false;
    if (item.requirePermission && !hasPermission(item.requirePermission)) return false;
    return true;
  });

  return (
    <div className="sf-layout min-h-screen flex flex-col relative text-[var(--color-text)]">
      {/* Responsive Theme-Aware Botanical Ambient Background */}
      <ThemeBackground />

      {/* AI Chat Widget (deferred off critical path) */}
      <Suspense fallback={null}>
        <LazyAIChatWidget />
      </Suspense>

      {/* Modern Botanical Header */}
      <header className="sticky top-0 z-40 bg-[var(--color-bg-card)]/90 dark:bg-[#111C15]/90 backdrop-blur-md border-b border-[var(--color-border)] transition-colors shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand */}
          <Link
            to="/"
            className="flex items-center gap-2.5 text-decoration-none shrink min-w-0 group"
          >
            <div className="w-9 h-9 rounded-xl bg-[var(--color-primary-subtle)] border border-[var(--color-secondary)]/40 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
              🌻
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-[var(--color-primary)] dark:text-[var(--color-text)] leading-tight truncate">
                Sunflower Studio
              </span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-secondary)]" aria-hidden="true" />
                <span className="text-[0.62rem] sm:text-[0.66rem] font-bold text-[var(--color-text-muted)] tracking-wider uppercase font-mono truncate">
                  {isKhmer ? "វេទិការោគវិនិច្ឆ័យកសិកម្ម" : "Agricultural Diagnostics"}
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 shrink-0" aria-label="Main navigation">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to);

              let label = t(item.labelKey);
              if (item.to === "/admin" && user) {
                label = user.role === "admin" ? t("nav.admin") : t("nav.expert");
              }

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    active
                      ? "bg-[var(--color-primary)] text-white dark:bg-[var(--color-primary)] dark:text-[#0E1712] font-bold shadow-2xs"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]"
                  }`}
                >
                  <Icon size={15} className="shrink-0" />
                  <span>{label}</span>
                </Link>
              );
            })}

            {/* About is a dedicated page, not a popup. */}
            <Link
              to="/about"
              aria-current={isActive("/about") ? "page" : undefined}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${isActive("/about") ? "bg-[var(--color-primary)] text-white dark:text-[#0E1712] shadow-2xs" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]"}`}
            >
              <Info size={15} className="shrink-0" aria-hidden="true" />
              <span>{t("nav.about")}</span>
            </Link>
          </nav>

          {/* Right Controls: Theme + Language + Auth */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <ThemeToggle />
            <LanguageToggle />

            {isAuthenticated ? (
              <div className="flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2.5 border-l border-[var(--color-border)] shrink-0">
                <Link
                  to="/profile"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-primary)] transition-all max-w-[140px] border border-[var(--color-border)]/60"
                  title={t("nav.profile")}
                >
                  <div className="w-5 h-5 rounded-full bg-[var(--color-primary-subtle)] text-[var(--color-primary)] flex items-center justify-center font-bold text-[0.65rem] uppercase shrink-0 border border-[var(--color-secondary)]/30">
                    {user?.username?.slice(0, 1)}
                  </div>
                  <span className="hidden sm:inline truncate">{user?.username}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="sf-btn sf-btn--ghost sf-btn--sm text-xs flex items-center gap-1 text-[var(--color-text-muted)] hover:text-[var(--color-error)] whitespace-nowrap"
                  title={t("nav.logout")}
                  aria-label={t("nav.logout")}
                >
                  <LogOut size={14} className="shrink-0" />
                  <span className="hidden sm:inline">{t("nav.logout")}</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="sf-btn sf-btn--primary sf-btn--sm text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-2xs"
              >
                <LogIn size={14} className="shrink-0" />
                <span>{t("nav.login")}</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Offline Status & Sync Banner */}
      <OfflineBanner />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 pb-28 md:pb-16">
        {children}
      </main>

      {/* Comprehensive Botanical Footer */}
      <AppFooter />

      {/* Mobile Floating Bottom Dock */}
      <BottomNav />
    </div>
  );
}
