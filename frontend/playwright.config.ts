import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env["E2E_BASE_URL"] ?? "http://127.0.0.1:4173";
const proxyTarget = process.env["E2E_API_TARGET"] ?? "http://127.0.0.1:8000";
const useExternalServer = Boolean(process.env["E2E_EXTERNAL_SERVER"]);
const browserChannel = process.env["E2E_BROWSER_CHANNEL"] ?? "chrome";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(browserChannel === "chromium" ? {} : { channel: browserChannel }),
      },
    },
  ],
  ...(useExternalServer
    ? {}
    : {
        webServer: {
          command: "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
          url: baseURL,
          reuseExistingServer: false,
          timeout: 30_000,
          env: {
            ...process.env,
            VITE_PROXY_TARGET: proxyTarget,
          },
        },
      }),
});
