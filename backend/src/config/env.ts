import "dotenv/config";
import { z } from "zod";

/**
 * Validation stricte de la configuration au démarrage.
 * Toute variable manquante ou invalide fait échouer le boot immédiatement.
 */
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL est requis"),

  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET trop court"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET trop court"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),

  FIELD_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "FIELD_ENCRYPTION_KEY doit faire 32 octets (64 hex)"),

  GITHUB_TOKEN: z.string().default(""),
  GITHUB_API_URL: z.string().url().default("https://api.github.com"),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  // eslint-disable-next-line no-console
  console.error(`Configuration invalide :\n${issues}`);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
