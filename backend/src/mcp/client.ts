import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { McpCaller, McpServer } from "./types.js";

/**
 * Appelant MCP réel : connecte un client au serveur MCP DISTANT via le
 * transport Streamable HTTP, exécute l'opération, puis ferme. Une connexion par
 * appel (simple et sûr) ; le timeout est appliqué par le SDK (RequestOptions).
 */
async function withClient<T>(
  server: McpServer,
  timeoutMs: number,
  fn: (c: Client) => Promise<T>,
): Promise<T> {
  const transport = new StreamableHTTPClientTransport(new URL(server.url), {
    requestInit: server.token
      ? { headers: { authorization: `Bearer ${server.token}` } }
      : undefined,
  });
  const client = new Client({ name: "aperio", version: "1.0.0" });
  try {
    await client.connect(transport, { timeout: timeoutMs });
    return await fn(client);
  } finally {
    await client.close().catch(() => undefined);
  }
}

export const realCaller: McpCaller = {
  async listTools(server, timeoutMs) {
    return withClient(server, timeoutMs, async (c) => {
      const res = await c.listTools(undefined, { timeout: timeoutMs });
      return res.tools.map((t) => ({ name: t.name }));
    });
  },

  async callTool(server, tool, args, timeoutMs) {
    return withClient(server, timeoutMs, async (c) => {
      return c.callTool({ name: tool, arguments: args }, undefined, {
        timeout: timeoutMs,
      });
    });
  },
};
