import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Users,
  Shield,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Loader2,
  Calendar,
  Mail,
} from "lucide-react";
import { useAdminUsers, useAdminRoles, useUpdateAdminUser } from "../hooks";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { AdminUserItem } from "@/types/api";

export function UsersPage(): React.JSX.Element {
  const { t } = useTranslation();
  const [page, setPage] = useState<number>(1);
  const pageSize = 15;

  const {
    data: usersData,
    isLoading: isLoadingUsers,
    isError: isUsersError,
  } = useAdminUsers(page, pageSize);
  const { data: rolesData, isLoading: isLoadingRoles } = useAdminRoles();
  const updateUserMutation = useUpdateAdminUser();

  // State for status toggle confirm dialog
  const [pendingDeactivateUser, setPendingDeactivateUser] = useState<AdminUserItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRoleChange = async (user: AdminUserItem, newRoleId: number) => {
    setErrorMessage(null);
    try {
      await updateUserMutation.mutateAsync({
        userId: user.id,
        data: { role_id: newRoleId },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("admin.users_update_error");
      setErrorMessage(message);
    }
  };

  const handleToggleActive = async (user: AdminUserItem) => {
    setErrorMessage(null);
    if (user.is_active) {
      // Prompt confirmation before deactivating
      setPendingDeactivateUser(user);
    } else {
      // Reactivate directly
      try {
        await updateUserMutation.mutateAsync({
          userId: user.id,
          data: { is_active: true },
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t("admin.users_update_error");
        setErrorMessage(message);
      }
    }
  };

  const confirmDeactivate = async () => {
    if (!pendingDeactivateUser) return;
    setErrorMessage(null);
    try {
      await updateUserMutation.mutateAsync({
        userId: pendingDeactivateUser.id,
        data: { is_active: false },
      });
      setPendingDeactivateUser(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("admin.users_update_error");
      setErrorMessage(message);
    }
  };

  const totalPages = usersData ? Math.ceil(usersData.total / pageSize) : 1;
  const roles = rolesData?.items ?? [];

  return (
    <div className="sf-admin-page max-w-7xl mx-auto">
      {/* Header */}
      <div className="sf-admin-page__header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="sf-admin-page__title text-2xl font-bold tracking-tight">
              {t("admin.users_title")}
            </h1>
            {usersData && (
              <span className="sf-badge sf-badge--neutral text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {usersData.total} {t("admin.users_total", { defaultValue: "users" })}
              </span>
            )}
          </div>
          <p className="sf-admin-page__desc text-sm text-[var(--color-text-muted)] mt-1">
            {t("admin.users_subtitle")}
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="sf-alert sf-alert--danger flex items-center gap-2 mb-6" role="alert">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isLoadingUsers || isLoadingRoles ? (
        <div className="sf-card flex flex-col items-center justify-center py-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600 dark:text-amber-400" />
          <p className="mt-3 text-sm font-medium text-[var(--color-text-muted)]">
            {t("common.loading")}
          </p>
        </div>
      ) : isUsersError || !usersData ? (
        <div className="sf-alert sf-alert--danger flex items-center gap-2" role="alert">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{t("admin.users_load_error")}</span>
        </div>
      ) : (
        <div className="sf-card p-0 overflow-hidden shadow-sm border border-[var(--color-border)]">
          <div className="overflow-x-auto">
            <table className="sf-table w-full">
              <thead>
                <tr>
                  <th className="font-semibold text-xs uppercase tracking-wider text-[var(--color-text-muted)] py-3.5 px-4">
                    {t("admin.users_col_username")}
                  </th>
                  <th className="font-semibold text-xs uppercase tracking-wider text-[var(--color-text-muted)] py-3.5 px-4">
                    {t("admin.users_col_email")}
                  </th>
                  <th className="font-semibold text-xs uppercase tracking-wider text-[var(--color-text-muted)] py-3.5 px-4">
                    {t("admin.users_col_role")}
                  </th>
                  <th className="font-semibold text-xs uppercase tracking-wider text-[var(--color-text-muted)] py-3.5 px-4">
                    {t("admin.users_col_status")}
                  </th>
                  <th className="font-semibold text-xs uppercase tracking-wider text-[var(--color-text-muted)] py-3.5 px-4">
                    {t("admin.users_col_created")}
                  </th>
                  <th className="font-semibold text-xs uppercase tracking-wider text-[var(--color-text-muted)] py-3.5 px-4 text-right">
                    {t("admin.users_col_actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {usersData.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-12 text-[var(--color-text-muted)] text-sm"
                    >
                      {t("admin.users_none_found")}
                    </td>
                  </tr>
                ) : (
                  usersData.items.map((u) => (
                    <tr key={u.id} className="transition-colors hover:bg-[var(--color-bg-subtle)]">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs uppercase">
                            {u.username.slice(0, 2)}
                          </div>
                          <span className="font-semibold text-sm text-[var(--color-text)]">
                            {u.username}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-sm text-[var(--color-text-muted)]">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 opacity-60" />
                          <span>{u.email}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="relative inline-flex items-center">
                          <Shield className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 absolute left-2.5 pointer-events-none z-10" />
                          <select
                            className="appearance-none text-xs font-semibold pl-8 pr-8 py-1.5 rounded-full bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-700/80 text-stone-800 dark:text-stone-200 cursor-pointer hover:border-amber-500/80 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            value={u.role_id}
                            disabled={updateUserMutation.isPending}
                            onChange={(e) => void handleRoleChange(u, Number(e.target.value))}
                            aria-label={t("admin.users_change_role_label", { username: u.username })}
                          >
                            {roles.map((r) => (
                              <option
                                key={r.id}
                                value={r.id}
                                className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                              >
                                {r.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500 absolute right-2.5 pointer-events-none" />
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`sf-badge inline-flex items-center gap-1 text-xs px-2.5 py-0.5 font-medium rounded-full ${
                            u.is_active
                              ? "sf-badge--success bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "sf-badge--neutral bg-slate-500/10 text-slate-500"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? "bg-amber-500" : "bg-slate-400"}`} />
                          {u.is_active
                            ? t("admin.users_status_active")
                            : t("admin.users_status_inactive")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 opacity-60" />
                          <span>{new Date(u.created_at).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          className={`sf-btn sf-btn--sm inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                            u.is_active
                              ? "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50"
                              : "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50"
                          }`}
                          disabled={updateUserMutation.isPending}
                          onClick={() => void handleToggleActive(u)}
                        >
                          {u.is_active ? (
                            <>
                              <UserX className="w-3.5 h-3.5" />
                              <span>{t("admin.users_btn_deactivate")}</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>{t("admin.users_btn_activate")}</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 p-4 border-t border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
              <span className="text-xs text-[var(--color-text-muted)]">
                {t("admin.pagination_showing_pages", { page, totalPages, total: usersData.total })}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="sf-btn sf-btn--outline sf-btn--sm inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg"
                  disabled={page <= 1 || updateUserMutation.isPending}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>{t("admin.pagination_prev")}</span>
                </button>
                <button
                  type="button"
                  className="sf-btn sf-btn--outline sf-btn--sm inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg"
                  disabled={page >= totalPages || updateUserMutation.isPending}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <span>{t("admin.pagination_next")}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog for Deactivation */}
      <ConfirmDialog
        isOpen={Boolean(pendingDeactivateUser)}
        title={t("admin.users_deactivate_confirm_title")}
        message={t("admin.users_deactivate_confirm_message", {
          username: pendingDeactivateUser?.username ?? "",
        })}
        confirmLabel={t("admin.users_btn_deactivate")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        isLoading={updateUserMutation.isPending}
        onConfirm={() => void confirmDeactivate()}
        onCancel={() => setPendingDeactivateUser(null)}
      />
    </div>
  );
}

