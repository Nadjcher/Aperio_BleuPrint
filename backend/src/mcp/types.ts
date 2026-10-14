import type { McpServer } from "../llm/index.js";

export type { McpServer };

/** Une demande d'appel d'outil MCP. */
export interface McpCallRequest {
  server: McpServer;
  tool: string;
  args?: Record<string, unknown>;
}

export type McpCallStatus = "ok" | "error" | "timeout" | "cache";

/** Résultat d'un appel MCP (jamais une exception — fallback sûr). */
export interface McpCallOutcome {
  server: string;
  tool: string;
  status: McpCallStatus;
  latencyMs: number;
  result?: unknown;
  error?: string;
}

/** Santé d'un serveur MCP (probe listTools). */
export interface McpServerHealth {
  server: string;
  ok: boolean;
  toolCount?: number;
  latencyMs: number;
  error?: string;
}

/**
 * Abstraction de l'appel réseau MCP : permet d'injecter un faux client en test
 * et d'utiliser le SDK MCP en production.
 */
export interface McpCaller {
  listTools(server: McpServer, timeoutMs: number): Promise<{ name: string }[]>;
  callTool(
    server: McpServer,
    tool: string,
    args: Record<string, unknown>,
    timeoutMs: number,
  ): Promise<unknown>;
}
