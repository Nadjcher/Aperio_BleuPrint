import { beforeEach, describe, expect, it, vi } from "vitest";
import { dispatch, probeServers } from "./dispatcher.js";
import { cacheClear } from "./cache.js";
import type { McpCaller, McpServer } from "./types.js";

const server: McpServer = { name: "test", url: "http://localhost:1/mcp" };

beforeEach(() => cacheClear());

describe("MCP dispatcher", () => {
  it("exécute les appels en parallèle (plus rapide que la somme des latences)", async () => {
    const caller: McpCaller = {
      listTools: async () => [],
      callTool: async () => {
        await new Promise((r) => setTimeout(r, 50));
        return { ok: true };
      },
    };
    const reqs = Array.from({ length: 5 }, (_, i) => ({ server, tool: `t${i}` }));
    const t0 = Date.now();
    const out = await dispatch(reqs, caller);
    const elapsed = Date.now() - t0;
    expect(out).toHaveLength(5);
    expect(out.every((o) => o.status === "ok")).toBe(true);
    // 5 × 50ms en série = 250ms ; en parallèle, nettement moins.
    expect(elapsed).toBeLessThan(200);
  });

  it("ne crashe jamais : un échec devient un outcome 'error'", async () => {
    const caller: McpCaller = {
      listTools: async () => [],
      callTool: async () => {
        throw new Error("boom");
      },
    };
    const out = await dispatch([{ server, tool: "x" }], caller);
    expect(out[0].status).toBe("error");
    expect(out[0].error).toContain("boom");
  });

  it("classe les dépassements de délai en 'timeout'", async () => {
    const caller: McpCaller = {
      listTools: async () => [],
      callTool: async () => {
        throw new Error("Request timed out");
      },
    };
    const out = await dispatch([{ server, tool: "x" }], caller);
    expect(out[0].status).toBe("timeout");
  });

  it("met en cache : le 2e appel identique n'appelle plus le serveur", async () => {
    const spy = vi.fn(async () => ({ v: 1 }));
    const caller: McpCaller = { listTools: async () => [], callTool: spy };
    const first = await dispatch([{ server, tool: "get", args: { a: 1 } }], caller);
    const second = await dispatch([{ server, tool: "get", args: { a: 1 } }], caller);
    expect(first[0].status).toBe("ok");
    expect(second[0].status).toBe("cache");
    expect(spy).toHaveBeenCalledTimes(1); // appelé une seule fois
  });

  it("probeServers renvoie l'état sans configuration (aucun serveur)", async () => {
    const caller: McpCaller = { listTools: async () => [{ name: "a" }], callTool: async () => ({}) };
    const health = await probeServers(caller);
    // Sans MCP_SERVERS en env de test, la liste est vide (pas d'erreur).
    expect(Array.isArray(health)).toBe(true);
  });
});
