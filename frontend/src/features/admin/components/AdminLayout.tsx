import type React from "react";
import { Link, useLocation, Outlet, Navigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/features/auth";
import { LanguageToggle } from "@/components/ui/LanguageToggle";

interface AdminNavItem {
  to: string;
  labelKey: string;
  icon: string;
  permission: string;
  exact?: boolean;
}

const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    to: "/admin",
    labelKey: "admin.nav_overview",
    icon: "📊",
    permission: "analytics:read",
    exact: true,
  },
  {
    to: "/admin/diseases",
    labelKey: "admin.nav_diseases",
    icon: "🔬",
    permission: "disease:read",
  },
  {
    to: "/admin/symptoms",
    labelKey: "admin.nav_symptoms",
    icon: "🍃",
    permission: "symptom:read",
  },
  {
    to: "/admin/feedback",
    labelKey: "admin.nav_feedback",
    icon: "💬",
    permission: "feedback:read",
  },
  {
    to: "/admin/users",
    labelKey: "admin.nav_users",
    icon: "👥",
    permission: "user:manage",
  },
  {
    to: "/admin/roles",
    labelKey: "admin.nav_roles",
    icon: "🛡️",
    permission: "rbac:manage",
  },
  // Rulesets hidden - system manages automatically
  // {
  //   to: "/admin/rulesets",
  //   labelKey: "admin.nav_rulesets",
  //   icon: "⚙️",
  //   permission: "ruleset:manage",
  // },
];

export function AdminLayout(): React.JSX.Element {
  const { t } = useTranslation();
  const { user, isAuthenticated, hasPermission } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Filter navigation items by holding server-side permission
  const allowedItems = ADMIN_NAV_ITEMS.filter((item) => hasPermission(item.permission));

  // If user has zero admin/agronomy permissions, redirect to grower portal
  if (allowedItems.length === 0) {
    return <Navigate to="/" replace />;
  }

  const isActive = (item: AdminNavItem) => {
    if (item.exact) {
      return location.pathname === item.to;
    }
    return location.pathname.startsWith(item.to);
  };

  return (
    <div className="sf-admin-layout">
      {/* Top Admin Header */}
      <header className="sf-admin-header">
        <div className="sf-admin-header__inner">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Link to="/admin" className="sf-header__brand" style={{ textDecoration: "none" }}>
              <span className="sf-header__logo" aria-hidden="true">
                🌻
              </span>
              <span className="sf-header__title" style={{ fontSize: "1.125rem" }}>
                {t("admin.workspace_title")}
              </span>
            </Link>
            <span
              className="sf-badge sf-badge--warning"
              style={{ fontSize: "0.6875rem", textTransform: "uppercase" }}
            >
              {user?.role}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Link
              to="/"
              className="sf-btn sf-btn--ghost sf-btn--sm"
              style={{ textDecoration: "none" }}
            >
              ← {t("admin.back_to_grower_app")}
            </Link>
            <LanguageToggle />
          </div>
        </div>
      </header>

      {/* Body: Sidebar + Main Content */}
      <div className="sf-admin-body">
        {/* Sidebar */}
        <aside className="sf-admin-sidebar" aria-label={t("admin.sidebar_label")}>
          <nav className="sf-admin-nav">
            {allowedItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`sf-admin-nav__link ${isActive(item) ? "sf-admin-nav__link--active" : ""}`}
              >
                <span className="sf-admin-nav__icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="sf-admin-nav__label">{t(item.labelKey)}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Workspace Content */}
        <main className="sf-admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
