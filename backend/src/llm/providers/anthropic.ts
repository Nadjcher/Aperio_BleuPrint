import Anthropic from "@anthropic-ai/sdk";
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import type { CompleteOptions, McpServer } from "../index.js";

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

/**
 * Complétion via le connecteur MCP de l'API Claude : le modèle peut appeler les
 * outils exposés par des serveurs MCP distants (exécutés côté Anthropic). On
 * déclare les serveurs (`mcp_servers`) ET les toolsets (`tools`), avec le beta
 * `mcp-client-2025-11-20`, et on relance tant que la génération est en pause
 * (`pause_turn`, le temps que les outils distants répondent).
 */
export async function completeAnthropicWithMcp(
  opts: CompleteOptions,
  servers: McpServer[],
): Promise<string | null> {
  const mcp_servers = servers.map((s) => ({
    type: "url" as const,
    name: s.name,
    url: s.url,
    ...(s.token ? { authorization_token: s.token } : {}),
  }));
  const tools = servers.map((s) => ({
    type: "mcp_toolset" as const,
    mcp_server_name: s.name,
  }));

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    { role: "user", content: opts.user },
  ];

  let res: Anthropic.Beta.BetaMessage | null = null;
  for (let i = 0; i < 8; i++) {
    res = await getClient().beta.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: opts.maxTokens ?? 2048,
      thinking: { type: "adaptive" },
      betas: ["mcp-client-2025-11-20"],
      mcp_servers,
      tools,
      system: opts.system,
      messages,
    });

    if (res.stop_reason === "refusal") {
      logger.warn({ details: res.stop_details }, "LLM (MCP) a refusé la requête");
      return null;
    }
    // La génération est en pause le temps que les outils MCP distants répondent.
    if (res.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: res.content });
      continue;
    }
    break;
  }

  const usedTools = (res?.content ?? []).filter(
    (b) => b.type === "mcp_tool_use",
  ).length;
  if (usedTools > 0) logger.info({ usedTools }, "Planner : outils MCP utilisés");

  const text = (res?.content ?? [])
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  return text.length > 0 ? text : null;
}
