import Anthropic from "@anthropic-ai/sdk";
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import type { CompleteOptions } from "../index.js";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

export async function completeAnthropic(
  opts: CompleteOptions,
): Promise<string | null> {
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
}
