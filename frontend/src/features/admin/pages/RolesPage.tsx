import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAdminRoles, useUpdateRolePermissions } from "../hooks";

export function RolesPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { data: rolesData, isLoading, isError } = useAdminRoles();
  const updateRolePermissionsMutation = useUpdateRolePermissions();

  // Local state for role -> Set of permission codes
  const [rolePermissions, setRolePermissions] = useState<Record<number, Set<string>>>({});
  const [savingRoleId, setSavingRoleId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Sync server data into local state when loaded
  useEffect(() => {
    if (rolesData) {
      const map: Record<number, Set<string>> = {};
      for (const role of rolesData.items) {
        map[role.id] = new Set(role.permissions);
      }
      setRolePermissions(map);
    }
  }, [rolesData]);

  const handleTogglePermission = (roleId: number, permissionCode: string) => {
    setStatusMessage(null);
    setRolePermissions((prev) => {
      const current = new Set(prev[roleId] ?? []);
      if (current.has(permissionCode)) {
        current.delete(permissionCode);
      } else {
        current.add(permissionCode);
      }
      return {
        ...prev,
        [roleId]: current,
      };
    });
  };

  const handleSaveRole = async (roleId: number) => {
    setStatusMessage(null);
    setSavingRoleId(roleId);
    try {
      const codes = Array.from(rolePermissions[roleId] ?? []);
      await updateRolePermissionsMutation.mutateAsync({
        roleId,
        permissionCodes: codes,
      });
      setStatusMessage({
        type: "success",
        text: t("admin.roles_save_success"),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("admin.roles_save_error");
      setStatusMessage({
        type: "error",
        text: message,
      });
    } finally {
      setSavingRoleId(null);
    }
  };

  const isRoleDirty = (roleId: number): boolean => {
    if (!rolesData) return false;
    const serverRole = rolesData.items.find((r) => r.id === roleId);
    if (!serverRole) return false;

    const serverSet = new Set(serverRole.permissions);
    const localSet = rolePermissions[roleId] ?? new Set();

    if (serverSet.size !== localSet.size) return true;
    for (const code of localSet) {
      if (!serverSet.has(code)) return true;
    }
    return false;
  };

  // Group permissions by prefix / domain
  const groupPermissions = () => {
    if (!rolesData) return {};
    const groups: Record<string, typeof rolesData.permissions> = {};

    for (const perm of rolesData.permissions) {
      const domain: string = perm.code.includes(":")
        ? (perm.code.split(":")[0] ?? "general")
        : "general";
      const currentList = groups[domain] ?? [];
      currentList.push(perm);
      groups[domain] = currentList;
    }
    return groups;
  };

  const permGroups = groupPermissions();
  const roles = rolesData?.items ?? [];

  return (
    <div className="sf-admin-page">
      <div className="sf-admin-page__header">
        <div>
          <h1 className="sf-admin-page__title">{t("admin.roles_title")}</h1>
          <p className="sf-admin-page__desc">{t("admin.roles_subtitle")}</p>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`sf-alert ${
            statusMessage.type === "success" ? "sf-alert--success" : "sf-alert--danger"
          }`}
          style={{ marginBottom: "1.5rem" }}
          role="alert"
        >
          {statusMessage.text}
        </div>
      )}

      {isLoading ? (
        <div className="sf-loading-state" style={{ padding: "3rem", textAlign: "center" }}>
          <span className="sf-spinner" aria-hidden="true" />
          <p style={{ marginTop: "1rem", color: "var(--color-text-muted)" }}>
            {t("common.loading")}
          </p>
        </div>
      ) : isError || !rolesData ? (
        <div className="sf-alert sf-alert--danger" role="alert">
          {t("admin.roles_load_error")}
        </div>
      ) : (
        <div className="sf-card" style={{ padding: "0", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="sf-table sf-matrix-table">
              <thead>
                <tr>
                  <th style={{ width: "40%" }}>{t("admin.roles_col_permission")}</th>
                  {roles.map((role) => (
                    <th key={role.id} style={{ textAlign: "center", minWidth: "140px" }}>
                      <div
                        style={{ fontWeight: 600, fontSize: "1rem", textTransform: "capitalize" }}
                      >
                        {role.name}
                      </div>
                      <div style={{ marginTop: "0.5rem" }}>
                        <button
                          type="button"
                          className="sf-btn sf-btn--primary sf-btn--sm"
                          disabled={!isRoleDirty(role.id) || savingRoleId === role.id}
                          onClick={() => void handleSaveRole(role.id)}
                        >
                          {savingRoleId === role.id ? t("common.saving") : t("common.save")}
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(permGroups).map(([group, permissions]) => (
                  <React.Fragment key={group}>
                    <tr style={{ backgroundColor: "var(--color-bg-subtle, #f8fafc)" }}>
                      <td
                        colSpan={roles.length + 1}
                        style={{
                          fontWeight: 700,
                          fontSize: "0.8125rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          color: "var(--color-text-muted)",
                          padding: "0.5rem 1rem",
                        }}
                      >
                        {group} {t("admin.roles_module_suffix")}
                      </td>
                    </tr>
                    {permissions.map((perm) => (
                      <tr key={perm.id}>
                        <td>
                          <div
                            style={{
                              fontFamily: "monospace",
                              fontWeight: 600,
                              fontSize: "0.875rem",
                            }}
                          >
                            {perm.code}
                          </div>
                          {perm.description && (
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                              {perm.description}
                            </div>
                          )}
                        </td>
                        {roles.map((role) => {
                          const isChecked = rolePermissions[role.id]?.has(perm.code) ?? false;
                          return (
                            <td key={role.id} style={{ textAlign: "center" }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleTogglePermission(role.id, perm.code)}
                                aria-label={`${role.name} - ${perm.code}`}
                                style={{ width: "1.125rem", height: "1.125rem", cursor: "pointer" }}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
