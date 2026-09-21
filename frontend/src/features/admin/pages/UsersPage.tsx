import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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
    <div className="sf-admin-page">
      <div className="sf-admin-page__header">
        <div>
          <h1 className="sf-admin-page__title">{t("admin.users_title")}</h1>
          <p className="sf-admin-page__desc">{t("admin.users_subtitle")}</p>
        </div>
      </div>

      {errorMessage && (
        <div className="sf-alert sf-alert--danger" style={{ marginBottom: "1.5rem" }} role="alert">
          {errorMessage}
        </div>
      )}

      {isLoadingUsers || isLoadingRoles ? (
        <div className="sf-loading-state" style={{ padding: "3rem", textAlign: "center" }}>
          <span className="sf-spinner" aria-hidden="true" />
          <p style={{ marginTop: "1rem", color: "var(--color-text-muted)" }}>
            {t("common.loading")}
          </p>
        </div>
      ) : isUsersError || !usersData ? (
        <div className="sf-alert sf-alert--danger" role="alert">
          {t("admin.users_load_error")}
        </div>
      ) : (
        <div className="sf-card" style={{ padding: "0", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="sf-table">
              <thead>
                <tr>
                  <th>{t("admin.users_col_username")}</th>
                  <th>{t("admin.users_col_email")}</th>
                  <th>{t("admin.users_col_role")}</th>
                  <th>{t("admin.users_col_status")}</th>
                  <th>{t("admin.users_col_created")}</th>
                  <th style={{ textAlign: "right" }}>{t("admin.users_col_actions")}</th>
                </tr>
              </thead>
              <tbody>
                {usersData.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        textAlign: "center",
                        padding: "2rem",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {t("admin.users_none_found")}
                    </td>
                  </tr>
                ) : (
                  usersData.items.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>{u.username}</td>
                      <td style={{ color: "var(--color-text-muted)" }}>{u.email}</td>
                      <td>
                        <select
                          className="sf-form-control"
                          style={{
                            padding: "0.25rem 0.5rem",
                            fontSize: "0.875rem",
                            width: "auto",
                            display: "inline-block",
                          }}
                          value={u.role_id}
                          disabled={updateUserMutation.isPending}
                          onChange={(e) => void handleRoleChange(u, Number(e.target.value))}
                          aria-label={t("admin.users_change_role_label", { username: u.username })}
                        >
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <span
                          className={`sf-badge ${
                            u.is_active ? "sf-badge--success" : "sf-badge--neutral"
                          }`}
                        >
                          {u.is_active
                            ? t("admin.users_status_active")
                            : t("admin.users_status_inactive")}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className={`sf-btn sf-btn--sm ${
                            u.is_active ? "sf-btn--outline-danger" : "sf-btn--outline"
                          }`}
                          disabled={updateUserMutation.isPending}
                          onClick={() => void handleToggleActive(u)}
                        >
                          {u.is_active
                            ? t("admin.users_btn_deactivate")
                            : t("admin.users_btn_activate")}
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1rem 1.5rem",
                borderTop: "1px solid var(--color-border)",
              }}
            >
              <span style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
                {t("admin.pagination_showing_pages", { page, totalPages, total: usersData.total })}
              </span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="sf-btn sf-btn--outline sf-btn--sm"
                  disabled={page <= 1 || updateUserMutation.isPending}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {t("admin.pagination_prev")}
                </button>
                <button
                  type="button"
                  className="sf-btn sf-btn--outline sf-btn--sm"
                  disabled={page >= totalPages || updateUserMutation.isPending}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  {t("admin.pagination_next")}
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
