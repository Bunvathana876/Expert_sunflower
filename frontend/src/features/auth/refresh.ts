/**
 * Single-flight token refresh manager with cross-tab Web Locks serialization.
 *
 * - Deduplicates concurrent 401/mount refreshes within a tab via `inFlightRefresh`.
 * - Serializes simultaneous multi-tab browser refreshes via `navigator.locks` when
 *   supported so multiple tabs share updated cookies without racing rotated tokens.
 */

const REFRESH_WEB_LOCK_NAME = "sunflower_auth_refresh_lock";

let inFlightRefresh: Promise<string | null> | null = null;

export function getInFlightRefresh(): Promise<string | null> | null {
  return inFlightRefresh;
}

async function withCrossTabLock<T>(fn: () => Promise<T>): Promise<T> {
  if (
    typeof navigator !== "undefined" &&
    "locks" in navigator &&
    typeof navigator.locks?.request === "function"
  ) {
    return navigator.locks.request(REFRESH_WEB_LOCK_NAME, () => fn());
  }
  return fn();
}

export async function singleFlightRefresh(
  refreshFn: () => Promise<string | null>,
  onFailure?: () => void,
): Promise<string | null> {
  if (inFlightRefresh) {
    return inFlightRefresh;
  }

  inFlightRefresh = withCrossTabLock(async () => {
    try {
      const newToken = await refreshFn();
      if (!newToken) {
        onFailure?.();
        return null;
      }
      return newToken;
    } catch {
      onFailure?.();
      return null;
    } finally {
      inFlightRefresh = null;
    }
  });

  return inFlightRefresh;
}

/** Reset in-flight state (useful for tests). */
export function resetSingleFlight(): void {
  inFlightRefresh = null;
}
