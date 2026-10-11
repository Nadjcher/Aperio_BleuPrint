import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

/**
 * Client Claude pour l'enrichissement (Phase 3).
 * Tout est optionnel : sans ANTHROPIC_API_KEY, `complete` renvoie null et les
 * appelants retombent sur leur logique heuristique. L'app reste fonctionnelle.
 */

let client: Anthropic | null = null;

export function isLLMEnabled(): boolean {
  return env.ANTHROPIC_API_KEY.length > 0;
}

function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

export interface CompleteOptions {
  system: string;
  user: string;
  maxTokens?: number;
}

/** Appel texte unique. Renvoie null si le LLM est désactivé ou en cas d'échec. */
export async function complete(opts: CompleteOptions): Promise<string | null> {
  if (!isLLMEnabled()) return null;
  try {
    const res = await getClient().messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: opts.maxTokens ?? 2048,
      thinking: { type: "adaptive" },
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
    });

    if (res.stop_reason === "refusal") {
      logger.warn({ details: res.stop_details }, "LLM a refusé la requête");
      return null;
    }

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return text.length > 0 ? text : null;
  } catch (err) {
    logger.warn({ err }, "LLM indisponible, repli sur l'heuristique");
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
