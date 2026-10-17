import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import type { CompleteOptions } from "../index.js";

/**
 * Provider compatible OpenAI (Chat Completions). Couvre :
 *   - Ollama  (local, gratuit)  : LLM_BASE_URL=http://localhost:11434/v1
 *   - Groq    (gratuit, rapide) : LLM_BASE_URL=https://api.groq.com/openai/v1
 *   - OpenRouter, Together, etc.
 *
 * Modèle par défaut : openai/gpt-oss-120b sur Groq (LLM_MODEL). Les modèles
 * Llama de Groq sont passés en offre entreprise (août 2026) ; gpt-oss-120b est
 * le modèle de production à usage général. Clé optionnelle (Ollama n'en demande pas).
 */

interface ChatResponse {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
}

export async function completeOpenAICompatible(
  opts: CompleteOptions,
): Promise<string | null> {
  const base = env.LLM_BASE_URL.replace(/\/+$/, "");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (env.LLM_API_KEY) headers.Authorization = `Bearer ${env.LLM_API_KEY}`;

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: env.LLM_MODEL,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
      max_tokens: opts.maxTokens ?? 2048,
      temperature: 0.3,
      stream: false,
    }),
    // Borne le temps d'attente : un endpoint lent (Groq surchargé, Ollama
    // local qui rame) ne doit pas bloquer la génération — on retombe sur
    // l'heuristique via le null renvoyé plus haut.
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ChatResponse | null;
    logger.warn(
      { status: res.status, message: body?.error?.message },
      "Appel LLM (OpenAI-compatible) en échec",
    );
    return null;
  }

  const data = (await res.json()) as ChatResponse;
  const text = data.choices?.[0]?.message?.content?.trim();
  return text && text.length > 0 ? text : null;
}
