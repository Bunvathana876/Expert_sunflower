import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { setCsrfToken, setOnRefreshNeeded, setTokenGetter } from "@/api/client";
import { loginApi, logoutApi, refreshApi, registerApi, updateMeApi } from "./api";
import { resetSingleFlight, singleFlightRefresh } from "./refresh";
import type { LoginCredentials, RegisterCredentials, UpdateMeCredentials, User } from "./types";

const LEGACY_STORAGE_KEYS = ["sunflower_auth_user", "sunflower_access_token"] as const;
const AUTH_SYNC_CHANNEL = "sunflower_auth_sync";

interface AuthSyncMessage {
  type: "logout" | "login";
}

/**
 * Scrub any legacy persistent auth keys so access tokens and user identities
 * never reside in Web Storage (`localStorage` / `sessionStorage`).
 */
function purgeLegacyAuthStorage(): void {
  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore storage access errors in restricted environments
    }
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Ignore storage access errors in restricted environments
    }
  }
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  updateProfile: (credentials: UpdateMeCredentials) => Promise<User>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<string | null>;
  hasPermission: (code: string) => boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export interface AuthProviderProps {
  children: ReactNode;
  onSessionExpired?: () => void;
}

export function AuthProvider({ children, onSessionExpired }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const tokenRef = useRef<string | null>(null);
  tokenRef.current = accessToken;

  const userRef = useRef<User | null>(null);
  userRef.current = user;

  // Monotonic epoch incremented on explicit login/register/logout transitions
  // so stale in-flight refresh responses can never overwrite newer auth state.
  const authEpochRef = useRef<number>(0);
  const syncChannelRef = useRef<BroadcastChannel | null>(null);

  const postAuthSync = useCallback((msg: AuthSyncMessage) => {
    try {
      syncChannelRef.current?.postMessage(msg);
    } catch {
      // Ignore closed/unsupported BroadcastChannel errors
    }
  }, []);

  const handleAuthSuccess = useCallback((token: string, userData: User) => {
    purgeLegacyAuthStorage();
    tokenRef.current = token;
    userRef.current = userData;
    setAccessToken(token);
    setUser(userData);
  }, []);

  const handleAuthClear = useCallback(() => {
    purgeLegacyAuthStorage();
    tokenRef.current = null;
    userRef.current = null;
    setCsrfToken(null);
    setAccessToken(null);
    setUser(null);
  }, []);

  const runRefresh = useCallback(
    async (notifyOnFailure: boolean): Promise<string | null> => {
      const hadActiveSession = Boolean(tokenRef.current || userRef.current);
      const startEpoch = authEpochRef.current;

      return singleFlightRefresh(
        async () => {
          const response = await refreshApi();
          if (authEpochRef.current !== startEpoch) {
            return null;
          }
          handleAuthSuccess(response.access_token, response.user);
          return response.access_token;
        },
        () => {
          if (authEpochRef.current !== startEpoch) {
            return;
          }
          handleAuthClear();
          if (notifyOnFailure && hadActiveSession) {
            onSessionExpired?.();
          }
        },
      );
    },
    [handleAuthSuccess, handleAuthClear, onSessionExpired],
  );

  const refreshSession = useCallback(async (): Promise<string | null> => {
    return runRefresh(true);
  }, [runRefresh]);

  // Register token getter and 401 refresh interceptor before child effects run
  useLayoutEffect(() => {
    setTokenGetter(() => tokenRef.current);
    setOnRefreshNeeded(refreshSession);
  }, [refreshSession]);

  // Restore session in memory via HttpOnly refresh cookie on initial mount
  useEffect(() => {
    let mounted = true;
    purgeLegacyAuthStorage();

    async function restoreSession() {
      try {
        await runRefresh(false);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void restoreSession();

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      try {
        channel = new BroadcastChannel(AUTH_SYNC_CHANNEL);
        syncChannelRef.current = channel;
        channel.onmessage = (event: MessageEvent<AuthSyncMessage>) => {
          if (!mounted || !event?.data) return;
          if (event.data.type === "logout") {
            authEpochRef.current += 1;
            resetSingleFlight();
            handleAuthClear();
          } else if (event.data.type === "login" && !tokenRef.current) {
            void runRefresh(false);
          }
        };
      } catch {
        channel = null;
      }
    }

    return () => {
      mounted = false;
      syncChannelRef.current = null;
      try {
        channel?.close();
      } catch {
        // Ignore close errors
      }
    };
  }, [runRefresh, handleAuthClear]);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<void> => {
      authEpochRef.current += 1;
      resetSingleFlight();
      const response = await loginApi(credentials);
      handleAuthSuccess(response.access_token, response.user);
      postAuthSync({ type: "login" });
    },
    [handleAuthSuccess, postAuthSync],
  );

  const register = useCallback(
    async (credentials: RegisterCredentials): Promise<void> => {
      authEpochRef.current += 1;
      resetSingleFlight();
      const response = await registerApi(credentials);
      handleAuthSuccess(response.access_token, response.user);
      postAuthSync({ type: "login" });
    },
    [handleAuthSuccess, postAuthSync],
  );

  const updateProfile = useCallback(async (credentials: UpdateMeCredentials): Promise<User> => {
    const updatedUser = await updateMeApi(credentials);
    userRef.current = updatedUser;
    setUser(updatedUser);
    return updatedUser;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    authEpochRef.current += 1;
    resetSingleFlight();
    try {
      await logoutApi();
    } finally {
      handleAuthClear();
      postAuthSync({ type: "logout" });
    }
  }, [handleAuthClear, postAuthSync]);

  const hasPermission = useCallback(
    (code: string): boolean => {
      if (!user || !user.permissions) return false;
      return user.permissions.includes(code);
    },
    [user],
  );

  const value: AuthContextType = {
    user,
    accessToken,
    isAuthenticated: Boolean(user && accessToken),
    isLoading,
    login,
    register,
    updateProfile,
    logout,
    refreshSession,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function usePermission(code: string): boolean {
  const { user } = useAuth();
  if (!user || !user.permissions) {
    return false;
  }
  return user.permissions.includes(code);
}

export interface RequirePermissionProps {
  code: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequirePermission({
  code,
  children,
  fallback = null,
}: RequirePermissionProps): React.JSX.Element | null {
  const { isLoading, isAuthenticated } = useAuth();
  const hasPermission = usePermission(code);

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated || !hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
