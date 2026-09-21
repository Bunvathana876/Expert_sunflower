import type React from "react";
import { useState } from "react";
import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { Home, BookOpen, Stethoscope, Clock, Info, LogOut, LogIn, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/features/auth";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { AboutModal } from "./AboutModal";
import { BottomNav } from "./BottomNav";

interface NavItem {
  to: string;
  labelKey: string;
  icon: typeof Home;
  requireAuth?: boolean;
  requirePermission?: string; // Any permission from a list
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", labelKey: "nav.home", icon: Home },
  { to: "/check", labelKey: "nav.check", icon: Stethoscope },
  { to: "/diseases", labelKey: "nav.diseases", icon: BookOpen },
  { to: "/history", labelKey: "nav.history", icon: Clock, requireAuth: true },
  { 
    to: "/admin", 
    labelKey: "nav.dashboard", // Will show "Admin" or "Expert" based on role
    icon: LayoutDashboard, 
    requireAuth: true,
    requirePermission: "analytics:read" // Any admin/expert permission
  },
];

/**
 * Main application layout with frosted glass header and mobile floating dock.
 */
export function AppLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { t } = useTranslation();
  const { isAuthenticated, logout, user, hasPermission } = useAuth();
  const location = useLocation();
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const visibleNav = NAV_ITEMS.filter((item) => {
    // Check authentication requirement
    if (item.requireAuth && !isAuthenticated) return false;
    
    // Check permission requirement
    if (item.requirePermission && !hasPermission(item.requirePermission)) return false;
    
    return true;
  });

  return (
    <div className="sf-layout min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* About Expert System Modal */}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />

      {/* Desktop Header */}
      <header className="sf-glass-header sticky top-0 z-40 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5 text-decoration-none shrink-0 group">
            <span
              className="text-2xl transition-transform group-hover:scale-110"
              aria-hidden="true"
            >
              🌻
            </span>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
                {t("app.title")}
              </span>
              <span className="text-[0.65rem] font-medium text-amber-800 dark:text-amber-400 tracking-wider uppercase font-mono">
                AI Expert System
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to);
              
              // Show "Admin" for admin role, "Expert" for expert role
              let label = t(item.labelKey);
              if (item.to === "/admin" && user) {
                label = user.role === "admin" ? t("nav.admin") : t("nav.expert");
              }

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    active
                      ? "bg-amber-500/15 text-amber-950 dark:text-amber-200 border border-amber-500/30 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <Icon size={15} />
                  <span>{label}</span>
                </Link>
              );
            })}

            {/* About Modal Trigger */}
            <button
              type="button"
              onClick={() => setIsAboutOpen(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1.5 transition-all"
            >
              <Info size={15} />
              <span>{t("nav.about")}</span>
            </button>
          </nav>

          {/* Right Controls: Theme + Language + Auth */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <ThemeToggle />
            <LanguageToggle />

            {isAuthenticated ? (
              <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-200 dark:border-slate-800">
                <span className="hidden sm:inline text-xs font-semibold text-slate-700 dark:text-slate-300 max-w-[100px] truncate">
                  {user?.username}
                </span>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="sf-btn sf-btn--ghost sf-btn--sm text-xs flex items-center gap-1 text-slate-500 hover:text-rose-600"
                  title={t("nav.logout")}
                  aria-label={t("nav.logout")}
                >
                  <LogOut size={14} />
                  <span className="hidden sm:inline">{t("nav.logout")}</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="sf-btn sf-btn--primary sf-btn--sm text-xs flex items-center gap-1"
              >
                <LogIn size={14} />
                <span>{t("nav.login")}</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-12">
        {children}
      </main>

      {/* Mobile Floating Bottom Dock */}
      <BottomNav onOpenAbout={() => setIsAboutOpen(true)} />
    </div>
  );
}
