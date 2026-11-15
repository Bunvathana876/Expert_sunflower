/**
 * Application Bootstrap & Runtime Hardening.
 *
 * Runs before any application imports or schema definitions.
 * Sets Zod's globalConfig.jitless = true so that Zod 4's allowsEval probe
 * skips testing `new Function("")`. Under strict Content Security Policies
 * without `'unsafe-eval'`, the browser reports `new Function("")` as a
 * CSP violation even when swallowed by try/catch.
 */

declare global {
  var __zod_globalConfig: { jitless?: boolean; [key: string]: unknown } | undefined;
}

globalThis.__zod_globalConfig = {
  ...globalThis.__zod_globalConfig,
  jitless: true,
};

export {};
