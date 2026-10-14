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
  // SSL vers la base (requis par Neon, Supabase, Render Postgres externe…).
  DATABASE_SSL: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET trop court"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET trop court"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),
  // Claims iss/aud : le jeton n'est accepté que s'il a été émis par et pour ce service.
  JWT_ISSUER: z.string().default("aperio"),
  JWT_AUDIENCE: z.string().default("aperio-api"),

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

  // MCP (Model Context Protocol) — outils externes pour le Planner.
  // Nécessite LLM_PROVIDER=anthropic + ANTHROPIC_API_KEY. Liste de serveurs MCP
  // DISTANTS (URL) au format JSON : [{"name":"github","url":"https://…","token":"…"}]
  MCP_SERVERS: z.string().default(""),
  PLANNER_USE_MCP: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  // Orchestration MCP côté client (dispatcher) : timeout par appel + TTL du cache.
  MCP_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  MCP_CACHE_TTL_MS: z.coerce.number().int().positive().default(3_600_000),

  // Mode invité : durée de vie avant purge automatique des comptes d'essai.
  GUEST_TTL_HOURS: z.coerce.number().int().positive().default(48),

  // ─── E-mail (optionnel, dégradation gracieuse) ─────────────────────────────
  // Sans provider configuré, les e-mails sont journalisés (pas envoyés) : le
  // flux d'inscription reste direct, rien ne casse.
  //   - "none"   : journalise seulement (défaut)
  //   - "resend" : envoi réel via l'API Resend (RESEND_API_KEY requis)
  EMAIL_PROVIDER: z.enum(["none", "resend"]).default("none"),
  RESEND_API_KEY: z.string().default(""),
  EMAIL_FROM: z.string().default("Aperio <onboarding@resend.dev>"),
  // URL publique du frontend, pour construire les liens des e-mails. Si vide,
  // on retombe sur CORS_ORIGIN.
  APP_BASE_URL: z.string().default(""),
  // Si true, la connexion exige un e-mail vérifié. Défaut false pour ne pas
  // bloquer les comptes existants.
  REQUIRE_EMAIL_VERIFICATION: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  // Limite globale par IP. 100/15min était trop strict pour un SPA qui sonde
  // l'état des jobs ; 1000/15min (~66/min) borne l'abus sans gêner l'usage
  // normal. Les routes d'auth gardent leur limiteur strict (10/15min).
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(1000),

  // Observabilité
  // Niveau de log (override : par défaut info en prod, debug sinon).
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .optional(),
  // Exposition des métriques Prometheus (/metrics).
  METRICS_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  // Jeton optionnel : si défini, /metrics exige Authorization: Bearer <token>.
  METRICS_TOKEN: z.string().default(""),
  // Port du endpoint /metrics du worker dédié (pas de serveur HTTP sinon).
  WORKER_METRICS_PORT: z.coerce.number().int().positive().default(9091),

  // RGPD — conservation limitée. Purge périodique (jouée par le worker) des
  // journaux d'audit anciens et des refresh tokens expirés/révoqués.
  AUDIT_RETENTION_DAYS: z.coerce.number().int().positive().default(365),
  MAINTENANCE_INTERVAL_MS: z.coerce.number().int().positive().default(86_400_000),

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
