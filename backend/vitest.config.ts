import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Config minimale pour que la validation d'env passe en test.
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgres://test:test@localhost:5432/test",
      JWT_ACCESS_SECRET: "test-access-secret-0123456789",
      JWT_REFRESH_SECRET: "test-refresh-secret-0123456789",
      FIELD_ENCRYPTION_KEY:
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    },
    include: ["src/**/*.test.ts"],
  },
});
