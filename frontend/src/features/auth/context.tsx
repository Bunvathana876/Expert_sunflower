import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { setOnRefreshNeeded, setTokenGetter } from "@/api/client";
import { loginApi, logoutApi, refreshApi, registerApi } from "./api";
import { singleFlightRefresh } from "./refresh";
import type { LoginCredentials, RegisterCredentials, User } from "./types";

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
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

  // Keep a ref to the latest accessToken so setTokenGetter can read it synchronously
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = accessToken;

  const handleAuthSuccess = useCallback((token: string, userData: User) => {
    tokenRef.current = token;
    setAccessToken(token);
    setUser(userData);
  }, []);

  const handleAuthClear = useCallback(() => {
    tokenRef.current = null;
    setAccessToken(null);
    setUser(null);
  }, []);

  const refreshSession = useCallback(async (): Promise<string | null> => {
    return singleFlightRefresh(
      async () => {
        const response = await refreshApi();
        handleAuthSuccess(response.access_token, response.user);
        return response.access_token;
      },
      () => {
        handleAuthClear();
        onSessionExpired?.();
      },
    );
  }, [handleAuthSuccess, handleAuthClear, onSessionExpired]);

  // Register token getter and refresh interceptor with API client
  useEffect(() => {
    setTokenGetter(() => tokenRef.current);
    setOnRefreshNeeded(refreshSession);
  }, [refreshSession]);

  // Attempt initial session restoration on mount
  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        const response = await refreshApi();
        if (mounted) {
          handleAuthSuccess(response.access_token, response.user);
        }
      } catch {
        if (mounted) {
          handleAuthClear();
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void restoreSession();

    return () => {
      mounted = false;
    };
  }, [handleAuthSuccess, handleAuthClear]);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<void> => {
      const response = await loginApi(credentials);
      handleAuthSuccess(response.access_token, response.user);
    },
    [handleAuthSuccess],
  );

  const register = useCallback(
    async (credentials: RegisterCredentials): Promise<void> => {
      const response = await registerApi(credentials);
      handleAuthSuccess(response.access_token, response.user);
    },
    [handleAuthSuccess],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await logoutApi();
    } finally {
      handleAuthClear();
    }
  }, [handleAuthClear]);

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
    isAuthenticated: !!user && !!accessToken,
    isLoading,
    login,
    register,
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
