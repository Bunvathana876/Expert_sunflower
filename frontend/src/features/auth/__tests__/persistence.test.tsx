import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { AuthProvider, useAuth } from "../context";
import { resetSingleFlight } from "../refresh";
import * as authApi from "../api";
import type { TokenResponse, User } from "../types";

vi.mock("../api", () => ({
  loginApi: vi.fn(),
  registerApi: vi.fn(),
  refreshApi: vi.fn(),
  logoutApi: vi.fn(),
  updateMeApi: vi.fn(),
}));

describe("AuthProvider Memory-Only Session & Refresh Restoration", () => {
  const mockUser: User = {
    id: 1,
    email: "admin@example.com",
    username: "admin",
    role: "admin",
    permissions: ["disease:read", "analytics:read"],
    is_active: true,
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    resetSingleFlight();
    vi.clearAllMocks();
  });

  it("restores session in memory via HttpOnly refresh cookie without persisting to Web Storage", async () => {
    vi.mocked(authApi.refreshApi).mockResolvedValueOnce({
      access_token: "refreshed-memory-token",
      token_type: "bearer",
      user: { ...mockUser, username: "admin_refreshed" },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    let hookResult: { current: ReturnType<typeof useAuth> } = {
      current: undefined as unknown as ReturnType<typeof useAuth>,
    };
    await act(async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      hookResult = result;
    });

    expect(hookResult.current.isAuthenticated).toBe(true);
    expect(hookResult.current.user?.username).toBe("admin_refreshed");
    expect(hookResult.current.accessToken).toBe("refreshed-memory-token");
    expect(hookResult.current.isLoading).toBe(false);

    // Access tokens and user identities must NEVER be stored in localStorage or sessionStorage
    expect(localStorage.getItem("sunflower_access_token")).toBeNull();
    expect(localStorage.getItem("sunflower_auth_user")).toBeNull();
    expect(sessionStorage.getItem("sunflower_access_token")).toBeNull();
    expect(sessionStorage.getItem("sunflower_auth_user")).toBeNull();
  });

  it("purges legacy localStorage keys on mount and prevents forged storage session restoration", async () => {
    // Plant forged legacy tokens in localStorage and sessionStorage
    localStorage.setItem("sunflower_auth_user", JSON.stringify(mockUser));
    localStorage.setItem("sunflower_access_token", "forged-local-token");
    sessionStorage.setItem("sunflower_access_token", "forged-session-token");

    const onSessionExpired = vi.fn();
    vi.mocked(authApi.refreshApi).mockRejectedValueOnce(new Error("Missing refresh cookie"));

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider onSessionExpired={onSessionExpired}>{children}</AuthProvider>
    );

    let hookResult: { current: ReturnType<typeof useAuth> } = {
      current: undefined as unknown as ReturnType<typeof useAuth>,
    };
    await act(async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      hookResult = result;
    });

    expect(hookResult.current.isAuthenticated).toBe(false);
    expect(hookResult.current.user).toBeNull();
    expect(hookResult.current.accessToken).toBeNull();
    expect(hookResult.current.isLoading).toBe(false);
    // Guest mount failure should not trigger expired-session toast/callback
    expect(onSessionExpired).not.toHaveBeenCalled();

    // Legacy keys must be actively scrubbed
    expect(localStorage.getItem("sunflower_auth_user")).toBeNull();
    expect(localStorage.getItem("sunflower_access_token")).toBeNull();
    expect(sessionStorage.getItem("sunflower_access_token")).toBeNull();
  });

  it("keeps login credentials strictly in memory and never writes to localStorage", async () => {
    vi.mocked(authApi.refreshApi).mockRejectedValueOnce(new Error("No cookie"));
    vi.mocked(authApi.loginApi).mockResolvedValueOnce({
      access_token: "new-login-token",
      token_type: "bearer",
      user: mockUser,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    let hookResult: { current: ReturnType<typeof useAuth> } = {
      current: undefined as unknown as ReturnType<typeof useAuth>,
    };
    await act(async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      hookResult = result;
    });

    await act(async () => {
      await hookResult.current.login({ identifier: "admin", password: "password123" });
    });

    expect(hookResult.current.isAuthenticated).toBe(true);
    expect(hookResult.current.accessToken).toBe("new-login-token");
    expect(hookResult.current.user?.email).toBe("admin@example.com");
    expect(localStorage.getItem("sunflower_access_token")).toBeNull();
    expect(localStorage.getItem("sunflower_auth_user")).toBeNull();
  });

  it("clears in-memory session on logout and ignores stale in-flight refresh responses", async () => {
    vi.mocked(authApi.refreshApi).mockResolvedValueOnce({
      access_token: "initial-token",
      token_type: "bearer",
      user: mockUser,
    });
    vi.mocked(authApi.logoutApi).mockResolvedValueOnce(undefined);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    let hookResult: { current: ReturnType<typeof useAuth> } = {
      current: undefined as unknown as ReturnType<typeof useAuth>,
    };
    await act(async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      hookResult = result;
    });
    expect(hookResult.current.isAuthenticated).toBe(true);

    // Start a slow refresh and logout before it resolves
    let resolveSlowRefresh!: (val: TokenResponse) => void;
    vi.mocked(authApi.refreshApi).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSlowRefresh = resolve;
        }),
    );

    let refreshPromise!: Promise<string | null>;
    act(() => {
      refreshPromise = hookResult.current.refreshSession();
    });

    await act(async () => {
      await hookResult.current.logout();
    });

    expect(hookResult.current.isAuthenticated).toBe(false);
    expect(hookResult.current.user).toBeNull();
    expect(hookResult.current.accessToken).toBeNull();

    // Resolve the stale refresh after logout: session MUST remain logged out
    await act(async () => {
      resolveSlowRefresh({
        access_token: "stale-zombie-token",
        token_type: "bearer",
        user: mockUser,
      });
      await refreshPromise;
    });

    expect(hookResult.current.isAuthenticated).toBe(false);
    expect(hookResult.current.user).toBeNull();
    expect(hookResult.current.accessToken).toBeNull();
  });

  it("deduplicates concurrent refreshSession calls into a single network request", async () => {
    vi.mocked(authApi.refreshApi).mockRejectedValueOnce(new Error("Guest mount"));

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    let hookResult: { current: ReturnType<typeof useAuth> } = {
      current: undefined as unknown as ReturnType<typeof useAuth>,
    };
    await act(async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      hookResult = result;
    });
    vi.mocked(authApi.refreshApi).mockClear();

    vi.mocked(authApi.refreshApi).mockResolvedValueOnce({
      access_token: "shared-single-flight-token",
      token_type: "bearer",
      user: mockUser,
    });

    let results: Array<string | null> = [];
    await act(async () => {
      results = await Promise.all([
        hookResult.current.refreshSession(),
        hookResult.current.refreshSession(),
        hookResult.current.refreshSession(),
      ]);
    });

    expect(authApi.refreshApi).toHaveBeenCalledTimes(1);
    expect(results).toEqual([
      "shared-single-flight-token",
      "shared-single-flight-token",
      "shared-single-flight-token",
    ]);
    expect(hookResult.current.accessToken).toBe("shared-single-flight-token");
  });
});
