import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { AppDataSource } from "../db/data-source.js";
import { McpCall } from "../entities/McpCall.js";
import { mcpServers } from "../llm/index.js";
import { cacheGet, cacheKey, cacheSet } from "./cache.js";
import { realCaller } from "./client.js";
import type {
  McpCallOutcome,
  McpCallRequest,
  McpCaller,
  McpServerHealth,
} from "./types.js";

/** Journalise un appel MCP (best-effort : ne casse jamais le flux métier). */
async function audit(o: Omit<McpCallOutcome, "result">): Promise<void> {
  if (!AppDataSource.isInitialized) return;
  try {
    const repo = AppDataSource.getRepository(McpCall);
    await repo.save(
      repo.create({
        server: o.server,
        tool: o.tool,
        status: o.status,
        latencyMs: o.latencyMs,
        error: o.error ?? null,
      }),
    );
  } catch (err) {
    logger.warn({ err }, "Échec d'audit MCP");
  }
}

function isTimeout(err: unknown): boolean {
  const m = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return m.includes("timeout") || m.includes("timed out") || m.includes("aborted");
}

/** Exécute UN appel MCP : cache → appel → audit. Ne lève jamais d'exception. */
async function dispatchOne(
  req: McpCallRequest,
  caller: McpCaller,
): Promise<McpCallOutcome> {
  const name = req.server.name;
  const args = req.args ?? {};
  const key = cacheKey(name, req.tool, args);

  const cached = cacheGet(key);
  if (cached.hit) {
    void audit({ server: name, tool: req.tool, status: "cache", latencyMs: 0 });
    return { server: name, tool: req.tool, status: "cache", latencyMs: 0, result: cached.value };
  }

  const t0 = Date.now();
  try {
    const result = await caller.callTool(req.server, req.tool, args, env.MCP_TIMEOUT_MS);
    const latencyMs = Date.now() - t0;
    cacheSet(key, result);
    void audit({ server: name, tool: req.tool, status: "ok", latencyMs });
    return { server: name, tool: req.tool, status: "ok", latencyMs, result };
  } catch (err) {
    const latencyMs = Date.now() - t0;
    const status = isTimeout(err) ? "timeout" : "error";
    const message = err instanceof Error ? err.message : "Erreur MCP inconnue";
    void audit({ server: name, tool: req.tool, status, latencyMs, error: message });
    logger.warn({ server: name, tool: req.tool, status, err }, "Appel MCP en échec");
    return { server: name, tool: req.tool, status, latencyMs, error: message };
  }
}

/**
 * Dispatcher : exécute plusieurs appels MCP EN PARALLÈLE, avec cache, timeout
 * par appel et audit. Aucun appel ne peut faire échouer les autres ni crasher
 * (chaque résultat porte son statut). C'est la brique d'orchestration MCP.
 */
export async function dispatch(
  requests: McpCallRequest[],
  caller: McpCaller = realCaller,
): Promise<McpCallOutcome[]> {
  return Promise.all(requests.map((r) => dispatchOne(r, caller)));
}

/** Sonde l'état de tous les serveurs MCP configurés (listTools), en parallèle. */
export async function probeServers(
  caller: McpCaller = realCaller,
): Promise<McpServerHealth[]> {
  const servers = mcpServers();
  return Promise.all(
    servers.map(async (server): Promise<McpServerHealth> => {
      const t0 = Date.now();
      try {
        const tools = await caller.listTools(server, env.MCP_TIMEOUT_MS);
        return { server: server.name, ok: true, toolCount: tools.length, latencyMs: Date.now() - t0 };
      } catch (err) {
        return {
          server: server.name,
          ok: false,
          latencyMs: Date.now() - t0,
          error: err instanceof Error ? err.message : "Erreur inconnue",
        };
      }
    }),
  );
}
