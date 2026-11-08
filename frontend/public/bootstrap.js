/**
 * Early Runtime Bootstrap for Strict CSP Compatibility.
 *
 * Runs synchronously before any application ES modules load.
 * Configures Zod's global singleton (`globalThis.__zod_globalConfig`) with
 * `jitless: true` so Zod 4 skips its `new Function("")` probe.
 *
 * Under strict Content Security Policies (`script-src 'self'`), attempting
 * `new Function("")` triggers a `securitypolicyviolation` event even if caught.
 */
globalThis.__zod_globalConfig = {
  ...globalThis.__zod_globalConfig,
  jitless: true,
};
