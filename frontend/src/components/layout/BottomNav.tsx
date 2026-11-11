import type React from "react";
import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { Home, Stethoscope, BookOpen, Clock, Info, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/features/auth";

interface BottomNavProps {
  onOpenAbout?: () => void;
}

export function BottomNav({ onOpenAbout }: BottomNavProps): React.JSX.Element {
  const { t } = useTranslation();
  const { isAuthenticated, hasPermission, user } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const navItems = [
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

  const visibleItems = navItems.filter((i) => {
    if (i.requireAuth && !isAuthenticated) return false;
    if (i.requirePermission && !hasPermission(i.requirePermission)) return false;
    return true;
  });

  return (
    <div className="fixed bottom-3 inset-x-0 z-40 flex justify-center px-3 sm:px-4 lg:hidden pointer-events-none pb-[env(safe-area-inset-bottom)]">
      <nav
        className="pointer-events-auto rounded-2xl px-1.5 py-1.5 flex items-center justify-around gap-1 max-w-md w-full bg-[var(--color-bg-card)]/95 dark:bg-[#14221A]/95 backdrop-blur-lg border border-[var(--color-border)] shadow-lg shadow-black/10 transition-colors"
        aria-label="Mobile navigation"
      >
        {visibleItems.map((item) => {
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
              title={label}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all min-h-[46px] select-none ${
                active
                  ? "bg-[var(--color-primary)] text-white dark:bg-[var(--color-primary)] dark:text-[#0E1712] font-bold shadow-xs"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]"
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.4 : 1.9} className="shrink-0" />
              <span className="block w-full text-[0.62rem] sm:text-[0.66rem] tracking-tight mt-0.5 leading-tight truncate text-center">
                {label}
              </span>
            </Link>
          );
        })}

        {/* About trigger on mobile */}
        {onOpenAbout && (
          <button
            type="button"
            onClick={onOpenAbout}
            title={t("nav.about")}
            className="flex-1 min-w-0 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] min-h-[46px] transition-all select-none"
            aria-label={t("nav.about")}
          >
            <Info size={18} strokeWidth={1.9} className="shrink-0" />
            <span className="block w-full text-[0.62rem] sm:text-[0.66rem] tracking-tight mt-0.5 leading-tight truncate text-center">
              {t("nav.about")}
            </span>
          </button>
        )}
      </nav>
    </div>
  );
}
