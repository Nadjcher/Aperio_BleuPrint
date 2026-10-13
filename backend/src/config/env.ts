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

  // Enrichissement par LLM (optionnel). Sans provider configuré, les agents
  // restent heuristiques et l'app fonctionne normalement.
  // - "auto"      : openai si LLM_BASE_URL, sinon anthropic si clé, sinon none
  // - "openai"    : tout endpoint compatible OpenAI (Ollama, Groq, OpenRouter…)
  // - "anthropic" : API Claude
  LLM_PROVIDER: z.enum(["auto", "openai", "anthropic", "none"]).default("auto"),

  // Provider compatible OpenAI (Llama & co.)
  // Ollama local : http://localhost:11434/v1   | Groq : https://api.groq.com/openai/v1
  LLM_BASE_URL: z.string().default(""),
  LLM_API_KEY: z.string().default(""),
  LLM_MODEL: z.string().default("llama-3.3-70b-versatile"),

  // Provider Anthropic (optionnel)
  ANTHROPIC_API_KEY: z.string().default(""),
  ANTHROPIC_MODEL: z.string().default("claude-opus-5-5"),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),

  // Jouer les migrations au boot (prod). À désactiver sur les process qui ne
  // doivent PAS migrer (ex. worker dédié) pour éviter toute course concurrente :
  // un seul process (l'API) applique les migrations, les autres attendent le schéma.
  RUN_MIGRATIONS: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),

  // Worker asynchrone (exécution différée des pipelines)
  WORKER_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  WORKER_POLL_MS: z.coerce.number().int().positive().default(2000),
  // Retry des jobs en échec : nombre max de tentatives et base du back-off
  // exponentiel (délai = base * 2^(attempts-1), borné à 1h).
  JOB_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
  JOB_BACKOFF_BASE_MS: z.coerce.number().int().positive().default(5000),
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
