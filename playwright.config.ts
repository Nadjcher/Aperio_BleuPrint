import { defineConfig } from "@playwright/test";

/**
 * Config E2E : tourne contre une pile locale déjà démarrée (voir scripts/e2e.sh)
 * sur http://localhost:5173 (front) + http://localhost:4100 (API).
 * Utilise le Chromium pré-installé de l'environnement (headless_shell).
 */
const CHROMIUM =
  process.env.PW_CHROMIUM ??
  "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    launchOptions: { executablePath: CHROMIUM },
  },
});
