import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  apiFetch,
  ApiError,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  setCsrfToken,
  setTokenGetter,
  setOnRefreshNeeded,
} from "../client";

describe("ApiError", () => {
  it("initializes with problem detail fields", () => {
    const error = new ApiError({
      status: 404,
      title: "Not Found",
      detail: "Resource not found",
      type: "/errors/not-found",
      errors: [{ field: "id", message: "Invalid ID" }],
    });

    expect(error.name).toBe("ApiError");
    expect(error.status).toBe(404);
    expect(error.title).toBe("Not Found");
    expect(error.detail).toBe("Resource not found");
    expect(error.message).toBe("Resource not found");
    expect(error.errors).toEqual([{ field: "id", message: "Invalid ID" }]);
  });

  it("falls back to title or default message if detail is missing", () => {
    const error = new ApiError({
      status: 500,
      title: "Server Error",
    });

    expect(error.status).toBe(500);
    expect(error.message).toBe("Server Error");
    expect(error.errors).toEqual([]);
  });
});

describe("apiFetch", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    setTokenGetter(() => null);
    setOnRefreshNeeded(async () => null);
    setCsrfToken(null);
    document.cookie = `${CSRF_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    setCsrfToken(null);
    document.cookie = `${CSRF_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    vi.restoreAllMocks();
  });

  it("fetches JSON and parses successfully", async () => {
    const mockData = { status: "ok" };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => mockData,
    });

    const result = await apiFetch<typeof mockData>("/health");
    expect(result).toEqual(mockData);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/health"),
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
  });

  it("attaches Authorization header when token is present", async () => {
    setTokenGetter(() => "test-token-123");

    globalThis.fetch = vi.fn().mockImplementation((_url, init) => {
      const headers = init?.headers as Headers;
      expect(headers.get("Authorization")).toBe("Bearer test-token-123");
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({}),
      });
    });

    await apiFetch("/test");
  });

  it("attaches X-CSRF-Token from sf_csrf cookie on POST requests and omits on GET", async () => {
    document.cookie = `${CSRF_COOKIE_NAME}=cookie-csrf-digest-123; path=/`;

    const seenHeaders: Array<{ method: string; csrf: string | null }> = [];
    globalThis.fetch = vi.fn().mockImplementation((_url, init) => {
      const headers = init?.headers as Headers;
      seenHeaders.push({
        method: (init?.method as string | undefined) ?? "GET",
        csrf: headers.get(CSRF_HEADER_NAME),
      });
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ ok: true }),
      });
    });

    await apiFetch("/diseases");
    await apiFetch("/auth/refresh", { method: "POST" });

    expect(seenHeaders).toEqual([
      { method: "GET", csrf: null },
      { method: "POST", csrf: "cookie-csrf-digest-123" },
    ]);
  });

  it("captures rotated X-CSRF-Token response header and clears it on logout", async () => {
    const sentCsrfTokens: Array<string | null> = [];

    globalThis.fetch = vi.fn().mockImplementation((url: string, init) => {
      const headers = init?.headers as Headers;
      sentCsrfTokens.push(headers.get(CSRF_HEADER_NAME));

      if (url.endsWith("/auth/login")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({
            "content-type": "application/json",
            [CSRF_HEADER_NAME]: "rotated-csrf-token-999",
          }),
          json: async () => ({ access_token: "tok", token_type: "bearer" }),
        });
      }
      if (url.endsWith("/auth/logout")) {
        return Promise.resolve({
          ok: true,
          status: 204,
          headers: new Headers(),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ ok: true }),
      });
    });

    await apiFetch("/auth/login", { method: "POST", body: JSON.stringify({}) });
    await apiFetch("/auth/logout", { method: "POST" });
    await apiFetch("/auth/refresh", { method: "POST" });

    expect(sentCsrfTokens).toEqual([
      null,
      "rotated-csrf-token-999",
      null,
    ]);
  });

  it("prefers live sf_csrf cookie over stale in-memory header cache after sibling-tab rotation", async () => {
    setCsrfToken("stale-tab-1-csrf-token");
    document.cookie = `${CSRF_COOKIE_NAME}=fresh-tab-2-cookie-csrf; path=/`;

    let observedCsrf: string | null = null;
    globalThis.fetch = vi.fn().mockImplementation((_url, init) => {
      const headers = init?.headers as Headers;
      observedCsrf = headers.get(CSRF_HEADER_NAME);
      return Promise.resolve({
        ok: true,
        status: 204,
        headers: new Headers(),
      });
    });

    await apiFetch("/auth/logout", { method: "POST" });
    expect(observedCsrf).toBe("fresh-tab-2-cookie-csrf");
  });

  it("throws ApiError with problem+json data on error response", async () => {
    const problem = {
      type: "/errors/validation-failed",
      title: "Validation Failed",
      status: 422,
      detail: "Input failed schema validation",
      errors: [{ field: "name", message: "field required" }],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      headers: new Headers({ "content-type": "application/problem+json" }),
      json: async () => problem,
    });

    await expect(apiFetch("/validate")).rejects.toThrow(ApiError);

    try {
      await apiFetch("/validate");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(422);
      expect(apiErr.title).toBe("Validation Failed");
      expect(apiErr.errors).toHaveLength(1);
      expect(apiErr.errors[0]?.field).toBe("name");
    }
  });

  it("allows registering refresh handler via setOnRefreshNeeded", () => {
    const mockCallback = vi.fn().mockResolvedValue(null);
    expect(() => setOnRefreshNeeded(mockCallback)).not.toThrow();
  });
});
