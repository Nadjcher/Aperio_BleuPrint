import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { completeAnthropic } from "./providers/anthropic.js";
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
