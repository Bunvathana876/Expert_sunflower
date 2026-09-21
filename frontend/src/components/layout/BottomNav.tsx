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
      labelKey: "nav.dashboard", // Will be overridden based on role
      icon: LayoutDashboard, 
      requireAuth: true, 
      requirePermission: "analytics:read" 
    },
  ];

  const visibleItems = navItems.filter((i) => {
    if (i.requireAuth && !isAuthenticated) return false;
    if (i.requirePermission && !hasPermission(i.requirePermission)) return false;
    return true;
  });

  return (
    <div className="fixed bottom-3 inset-x-0 z-40 flex justify-center px-4 md:hidden pointer-events-none">
      <nav
        className="sf-glass-dock pointer-events-auto rounded-2xl px-2 py-1.5 flex items-center justify-around gap-1 max-w-md w-full"
        aria-label="Mobile navigation"
      >
        {visibleItems.map((item) => {
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
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all min-h-[44px] ${
                active
                  ? "text-amber-800 dark:text-amber-400 font-bold bg-amber-500/15"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Icon size={19} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[0.65rem] tracking-tight mt-0.5 leading-none">
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
            className="flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 min-h-[44px]"
            aria-label={t("nav.about")}
          >
            <Info size={19} />
            <span className="text-[0.65rem] tracking-tight mt-0.5 leading-none">
              {t("nav.about")}
            </span>
          </button>
        )}
      </nav>
    </div>
  );
}
