import { expect, test, type Page } from "@playwright/test";

const FORBIDDEN_STORAGE_FRAGMENTS = [
  "access_token",
  "refresh_token",
  "sunflower_auth_user",
  "sunflower_access_token",
];

async function readWebStorageSnapshot(page: Page): Promise<{
  localKeys: string[];
  sessionKeys: string[];
  serializedValues: string;
}> {
  return page.evaluate(() => {
    const localEntries: Record<string, string | null> = {};
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (k) localEntries[k] = window.localStorage.getItem(k);
    }
    const sessionEntries: Record<string, string | null> = {};
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const k = window.sessionStorage.key(i);
      if (k) sessionEntries[k] = window.sessionStorage.getItem(k);
    }
    return {
      localKeys: Object.keys(localEntries),
      sessionKeys: Object.keys(sessionEntries),
      serializedValues: JSON.stringify({ localEntries, sessionEntries }),
    };
  });
}

test.describe("Browser Authentication Lifecycle, Cookie Rotation, CSRF & CSP", () => {
  test("verifies end-to-end register, memory-only token, reload rotation, CSRF, multi-tab sync & logout", async ({
    context,
    page,
    request,
  }) => {
    const cspViolations: string[] = [];
    await context.addInitScript(() => {
      window.addEventListener("securitypolicyviolation", (ev) => {
        const win = window as unknown as { __cspViolations?: string[] };
        win.__cspViolations = win.__cspViolations ?? [];
        win.__cspViolations.push(`${ev.violatedDirective}:${ev.blockedURI}`);
      });
    });

    const apiHealthBase = process.env["E2E_API_TARGET"] ?? "http://127.0.0.1:8000";

    // 1. Verify backend liveness & strict readiness (DB + Alembic 0004)
    const liveResp = await request.get(`${apiHealthBase}/health/live`);
    expect(liveResp.status()).toBe(200);
    expect(await liveResp.json()).toMatchObject({ status: "ok" });

    const readyResp = await request.get(`${apiHealthBase}/health/ready`);
    expect(readyResp.status()).toBe(200);
    const readyBody = (await readyResp.json()) as Record<string, unknown>;
    expect(readyBody).toMatchObject({
      status: "ready",
      db: "up",
      migration: "ok",
      required_revision: "0004",
    });

    // Production environment safety guard: refuse to mutate production database
    if (readyBody["environment"] === "production") {
      throw new Error(
        "FATAL SAFETY GUARD: E2E authentication lifecycle tests cannot run against a production backend environment!",
      );
    }

    // 2. Navigate to /register and verify strict CSP header on document response
    const docResponse = await page.goto("/register");
    expect(docResponse).not.toBeNull();
    const docCsp = docResponse?.headers()["content-security-policy"] ?? "";
    expect(docCsp).toContain("default-src 'self'");
    expect(docCsp).toContain("script-src 'self'");
    expect(docCsp).not.toContain("script-src 'self' 'unsafe-inline'");

    const suffix = `${Date.now()}_${Math.floor(Math.random() * 10_000)}`;
    const username = `e2e_user_${suffix}`.slice(0, 28);
    const email = `${username}@example.com`;
    const password = "StrongE2ePassword!2026";

    await page.locator("#email").fill(email);
    await page.locator("#username").fill(username);
    await page.locator("#password").fill(password);

    const registerResponsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/v1/auth/register") && res.request().method() === "POST",
    );
    await page.locator('button[type="submit"]').click();
    const registerResponse = await registerResponsePromise;
    expect(registerResponse.status()).toBe(201);

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText(username)).toBeVisible();

    // 3. Verify browser cookie flags (HttpOnly refresh_token + readable sf_csrf) & zero Web Storage tokens
    const cookiesAfterAuth = await context.cookies();
    const refreshCookie1 = cookiesAfterAuth.find((c) => c.name === "refresh_token");
    const csrfCookie1 = cookiesAfterAuth.find((c) => c.name === "sf_csrf");
    expect(refreshCookie1).toBeDefined();
    expect(refreshCookie1?.httpOnly).toBe(true);
    expect(refreshCookie1?.sameSite).toBe("Lax");
    expect(csrfCookie1).toBeDefined();
    expect(csrfCookie1?.httpOnly).toBe(false);
    expect(csrfCookie1?.sameSite).toBe("Lax");

    const jsCookieString = await page.evaluate(() => document.cookie);
    expect(jsCookieString).not.toContain("refresh_token=");
    expect(jsCookieString).toContain("sf_csrf=");

    const storageAfterLogin = await readWebStorageSnapshot(page);
    for (const forbidden of FORBIDDEN_STORAGE_FRAGMENTS) {
      expect(storageAfterLogin.serializedValues).not.toContain(forbidden);
    }

    // 4. Navigate to protected route (/history) and perform a full browser reload
    await page.goto("/history", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/history$/);
    await expect(page.getByText(username)).toBeVisible();

    const cookiesBeforeReload = await context.cookies();
    const refreshCookieBeforeReload = cookiesBeforeReload.find((c) => c.name === "refresh_token");
    const csrfCookieBeforeReload = cookiesBeforeReload.find((c) => c.name === "sf_csrf");
    expect(refreshCookieBeforeReload?.value).toBeTruthy();
    expect(refreshCookieBeforeReload?.value).not.toBe(refreshCookie1?.value);
    expect(csrfCookieBeforeReload?.value).toBeTruthy();
    expect(csrfCookieBeforeReload?.value).not.toBe(csrfCookie1?.value);

    const reloadRefreshPromise = page.waitForResponse(
      (res) => res.url().includes("/api/v1/auth/refresh") && res.request().method() === "POST",
    );
    await page.reload({ waitUntil: "networkidle" });
    const reloadRefreshResp = await reloadRefreshPromise;
    expect(reloadRefreshResp.status()).toBe(200);
    expect(reloadRefreshResp.request().headers()["x-csrf-token"]).toBe(
      csrfCookieBeforeReload?.value,
    );

    // Must remain on /history as authenticated user after full reload
    await expect(page).toHaveURL(/\/history$/);
    await expect(page.getByText(username)).toBeVisible();

    // Verify refresh_token and sf_csrf cookies rotated again on reload
    const cookiesAfterReload = await context.cookies();
    const refreshCookie2 = cookiesAfterReload.find((c) => c.name === "refresh_token");
    const csrfCookie2 = cookiesAfterReload.find((c) => c.name === "sf_csrf");
    expect(refreshCookie2?.value).toBeTruthy();
    expect(refreshCookie2?.value).not.toBe(refreshCookieBeforeReload?.value);
    expect(csrfCookie2?.value).toBeTruthy();
    expect(csrfCookie2?.value).not.toBe(csrfCookieBeforeReload?.value);

    const storageAfterReload = await readWebStorageSnapshot(page);
    for (const forbidden of FORBIDDEN_STORAGE_FRAGMENTS) {
      expect(storageAfterReload.serializedValues).not.toContain(forbidden);
    }

    // 5. Verify CSRF defense rejects forged X-CSRF-Token in live browser context with 403
    const forgedCsrfStatus = await page.evaluate(async () => {
      const resp = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-CSRF-Token": "0000000000000000000000000000000000000000000000000000000000000000",
        },
      });
      return resp.status;
    });
    expect(forgedCsrfStatus).toBe(403);

    // 6. Verify simultaneous two-tab reload preserves session via Web Locks coordination
    const page2 = await context.newPage();
    await page2.goto("/history", { waitUntil: "networkidle" });
    await expect(page2.getByText(username)).toBeVisible();
    await Promise.all([
      page.reload({ waitUntil: "networkidle" }),
      page2.reload({ waitUntil: "networkidle" }),
    ]);
    await expect(page).toHaveURL(/\/history$/);
    await expect(page2).toHaveURL(/\/history$/);
    await expect(page2.getByText(username)).toBeVisible();

    // 7. Logout terminates session, clears cookies, and synchronizes open tabs
    const logoutRespPromise = page.waitForResponse(
      (res) => res.url().includes("/api/v1/auth/logout") && res.request().method() === "POST",
    );
    await page.locator('header button[aria-label]').last().click();
    const logoutResp = await logoutRespPromise;
    expect(logoutResp.status()).toBe(204);

    const cookiesAfterLogout = await context.cookies();
    expect(cookiesAfterLogout.find((c) => c.name === "refresh_token")).toBeUndefined();
    expect(cookiesAfterLogout.find((c) => c.name === "sf_csrf")).toBeUndefined();

    // Sibling tab synchronized logout via BroadcastChannel without Web Storage
    await expect(page2.getByText(username)).toHaveCount(0);

    // Protected /profile route redirects unauthenticated session to /login
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login/);

    // Check zero CSP violations occurred across the entire browser lifecycle
    const recordedViolations = await page.evaluate(() => {
      const win = window as unknown as { __cspViolations?: string[] };
      return win.__cspViolations ?? [];
    });
    cspViolations.push(...recordedViolations);
    expect(cspViolations).toEqual([]);

    await page2.close();
  });
});
