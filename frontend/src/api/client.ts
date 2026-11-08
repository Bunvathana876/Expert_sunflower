/**
 * Typed API client for the Sunflower backend.
 *
 * Security invariants:
 * - Access tokens are retrieved from an in-memory getter registered by AuthProvider
 *   (never read from or persisted to localStorage/sessionStorage).
 * - Cookie-authenticated mutations automatically attach `X-CSRF-Token` derived from
 *   the server-issued `X-CSRF-Token` response header or `sf_csrf` cookie.
 * - Concurrent 401 responses share a single-flight refresh via `_onRefreshNeeded`.
 */

const rawBase = (import.meta.env["VITE_API_BASE_URL"] as string | undefined)?.trim();
const BASE_URL = (rawBase && rawBase.length > 0 ? rawBase : "/api/v1").replace(/\/+$/, "");

export const CSRF_COOKIE_NAME = "sf_csrf";
export const CSRF_HEADER_NAME = "X-CSRF-Token";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// ---------------------------------------------------------------------------
// Typed error class
// ---------------------------------------------------------------------------

export interface ProblemDetail {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  errors?: Array<{ field: string; message: string }>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly title: string;
  readonly detail: string;
  readonly errors: Array<{ field: string; message: string }>;

  constructor(problem: ProblemDetail) {
    super(problem.detail ?? problem.title ?? `HTTP ${problem.status}`);
    this.name = "ApiError";
    this.status = problem.status;
    this.title = problem.title ?? "Error";
    this.detail = problem.detail ?? "";
    this.errors = problem.errors ?? [];
  }
}

// ---------------------------------------------------------------------------
// Injectable in-memory hooks
// ---------------------------------------------------------------------------

type TokenGetter = () => string | null;
type RefreshCallback = () => Promise<string | null>;

let _tokenGetter: TokenGetter = () => null;
let _onRefreshNeeded: RefreshCallback | null = null;
let _csrfToken: string | null = null;

/** Register a function that returns the current in-memory bearer token. */
export function setTokenGetter(fn: TokenGetter): void {
  _tokenGetter = fn;
}

/** Register an async callback invoked once when a protected request returns 401. */
export function setOnRefreshNeeded(fn: RefreshCallback): void {
  _onRefreshNeeded = fn;
}

/** Explicitly set or clear the in-memory CSRF token cache. */
export function setCsrfToken(token: string | null): void {
  _csrfToken = token;
}

function _readCookie(name: string): string | null {
  if (typeof document === "undefined" || typeof document.cookie !== "string") {
    return null;
  }
  const prefix = `${encodeURIComponent(name)}=`;
  const parts = document.cookie.split(";");
  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (part.startsWith(prefix)) {
      const value = part.slice(prefix.length);
      return value ? decodeURIComponent(value) : null;
    }
  }
  return null;
}

/**
 * Resolve the current CSRF token from the live `sf_csrf` cookie first (always
 * synchronized across sibling browser tabs after refresh rotation), falling back
 * to the in-memory header cache when `document.cookie` is unavailable.
 */
export function getCsrfToken(): string | null {
  return _readCookie(CSRF_COOKIE_NAME) ?? _csrfToken;
}

function _captureCsrfHeader(response: Response): void {
  const headerToken = response.headers?.get?.(CSRF_HEADER_NAME);
  if (headerToken) {
    _csrfToken = headerToken;
  }
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

async function _parseResponse<T>(response: Response): Promise<T> {
  _captureCsrfHeader(response);
  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok) {
    if (contentType.includes("problem+json") || contentType.includes("application/json")) {
      const problem = (await response.json()) as ProblemDetail;
      throw new ApiError({ ...problem, status: problem.status ?? response.status });
    }
    throw new ApiError({ status: response.status, title: response.statusText });
  }

  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as unknown as T;
  }

  return (await response.json()) as T;
}

/**
 * Typed fetch wrapper.
 *
 * - Prepends VITE_API_BASE_URL to `path`.
 * - Attaches in-memory bearer token when available.
 * - Attaches `X-CSRF-Token` on state-changing requests when available.
 * - Parses application/problem+json errors into ApiError.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = _tokenGetter();
  const method = (init.method ?? "GET").toUpperCase();

  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (!headers.has("Content-Type") && init.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (UNSAFE_METHODS.has(method) && !headers.has(CSRF_HEADER_NAME)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers.set(CSRF_HEADER_NAME, csrfToken);
    }
  }

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url =
    path.startsWith("http://") || path.startsWith("https://") ? path : `${BASE_URL}${cleanPath}`;
  const response = await fetch(url, { ...init, headers, credentials: "include" });
  _captureCsrfHeader(response);

  if (cleanPath.startsWith("/auth/logout") && response.ok) {
    _csrfToken = null;
  }

  const isAuthEndpoint =
    cleanPath.startsWith("/auth/login") ||
    cleanPath.startsWith("/auth/refresh") ||
    cleanPath.startsWith("/auth/register") ||
    cleanPath.startsWith("/auth/logout");

  if (response.status === 401 && _onRefreshNeeded && !isAuthEndpoint) {
    const newToken = await _onRefreshNeeded();
    if (newToken) {
      headers.set("Authorization", `Bearer ${newToken}`);
      if (UNSAFE_METHODS.has(method)) {
        const refreshedCsrf = getCsrfToken();
        if (refreshedCsrf) {
          headers.set(CSRF_HEADER_NAME, refreshedCsrf);
        }
      }
      const retried = await fetch(url, { ...init, headers, credentials: "include" });
      return _parseResponse<T>(retried);
    }
  }

  return _parseResponse<T>(response);
}
