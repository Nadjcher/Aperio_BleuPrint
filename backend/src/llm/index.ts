import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { completeAnthropic, completeAnthropicWithMcp } from "./providers/anthropic.js";
import { completeOpenAICompatible } from "./providers/openai.js";

/**
 * Couche LLM multi-provider pour l'enrichissement (Phase 3).
 *
 * Providers :
 *   - "openai"    : tout endpoint compatible OpenAI (Ollama local, Groq, OpenRouter…)
 *                   -> permet un LLM gratuit type Llama, hébergé ou en local.
 *   - "anthropic" : API Claude.
 *
 * Tout est optionnel : sans provider configuré, `complete` renvoie null et les
 * appelants retombent sur leur logique heuristique. L'app reste fonctionnelle.
 */

export type Provider = "openai" | "anthropic" | "none";

export function resolveProvider(): Provider {
  switch (env.LLM_PROVIDER) {
    case "openai":
      return env.LLM_BASE_URL ? "openai" : "none";
    case "anthropic":
      return env.ANTHROPIC_API_KEY ? "anthropic" : "none";
    case "none":
      return "none";
    case "auto":
    default:
      if (env.LLM_BASE_URL) return "openai";
      if (env.ANTHROPIC_API_KEY) return "anthropic";
      return "none";
  }
}

export function isLLMEnabled(): boolean {
  return resolveProvider() !== "none";
}

export interface CompleteOptions {
  system: string;
  user: string;
  maxTokens?: number;
}

/** Serveur MCP distant (Model Context Protocol) exposant des outils au LLM. */
export interface McpServer {
  name: string;
  url: string;
  token?: string;
}

/** Parse la liste des serveurs MCP depuis l'env (JSON). Tolérant aux erreurs. */
export function mcpServers(): McpServer[] {
  if (!env.MCP_SERVERS.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(env.MCP_SERVERS);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (s): s is { name: string; url: string; token?: string } =>
          !!s && typeof s.name === "string" && typeof s.url === "string",
      )
      .map((s) => ({ name: s.name, url: s.url, token: typeof s.token === "string" ? s.token : undefined }));
  } catch {
    logger.warn("MCP_SERVERS invalide (JSON attendu) — MCP désactivé");
    return [];
  }
}

/** MCP actif : provider Anthropic + activé + au moins un serveur configuré. */
export function isMcpEnabled(): boolean {
  return resolveProvider() === "anthropic" && env.PLANNER_USE_MCP && mcpServers().length > 0;
}

/**
 * Complétion pour le Planner : si MCP est actif, le LLM peut appeler des outils
 * exposés par les serveurs MCP distants (connecteur MCP de l'API Claude) ;
 * sinon, complétion texte classique.
 */
export async function completePlanner(opts: CompleteOptions): Promise<string | null> {
  if (isMcpEnabled()) {
    try {
      return await completeAnthropicWithMcp(opts, mcpServers());
    } catch (err) {
      logger.warn({ err }, "Planner MCP indisponible, repli sur l'heuristique");
      return null;
    }
  }
  return complete(opts);
}

/** État de configuration du LLM (sans secret) pour le diagnostic. */
export interface LLMStatus {
  provider: Provider;
  enabled: boolean;
  model: string;
  baseUrlSet: boolean;
  apiKeySet: boolean;
}

export function llmStatus(): LLMStatus {
  const provider = resolveProvider();
  return {
    provider,
    enabled: provider !== "none",
    model: provider === "anthropic" ? env.ANTHROPIC_MODEL : env.LLM_MODEL,
    baseUrlSet: Boolean(env.LLM_BASE_URL),
    apiKeySet: Boolean(provider === "anthropic" ? env.ANTHROPIC_API_KEY : env.LLM_API_KEY),
  };
}

/**
 * Teste réellement le LLM avec une requête minimale et remonte l'erreur exacte
 * (modèle décommissionné, clé invalide…) — contrairement à `complete` qui
 * retombe silencieusement sur l'heuristique. Pour le diagnostic uniquement.
 */
export async function pingLLM(): Promise<{ ok: boolean; status?: number; error?: string }> {
  const provider = resolveProvider();
  if (provider === "none") return { ok: false, error: "Aucun provider configuré (LLM_PROVIDER / clé / base URL)" };
  try {
    if (provider === "openai") {
      const base = env.LLM_BASE_URL.replace(/\/+$/, "");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (env.LLM_API_KEY) headers.Authorization = `Bearer ${env.LLM_API_KEY}`;
      const res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: env.LLM_MODEL,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1,
          stream: false,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) return { ok: true, status: res.status };
      const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      return { ok: false, status: res.status, error: (body?.error?.message ?? `HTTP ${res.status}`).slice(0, 300) };
    }
    // anthropic
    const text = await completeAnthropic({ system: "ping", user: "ping", maxTokens: 1 });
    return { ok: text !== null, error: text === null ? "Réponse vide ou refus" : undefined };
  } catch (err) {
    return { ok: false, error: (err instanceof Error ? err.message : String(err)).slice(0, 300) };
  }
}

/** Appel texte unique. Renvoie null si le LLM est désactivé ou en cas d'échec. */
export async function complete(opts: CompleteOptions): Promise<string | null> {
  const provider = resolveProvider();
  try {
    switch (provider) {
      case "openai":
        return await completeOpenAICompatible(opts);
      case "anthropic":
        return await completeAnthropic(opts);
      default:
        return null;
    }
  } catch (err) {
    logger.warn({ err, provider }, "LLM indisponible, repli sur l'heuristique");
    return null;
  }
}

/** Extrait le premier objet/tableau JSON d'un texte LLM. Tolérant au bruit. */
export function extractJson<T>(text: string | null): T | null {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}
