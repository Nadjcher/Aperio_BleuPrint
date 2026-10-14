import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { mcpServers } from "../llm/index.js";
import { probeServers } from "../mcp/dispatcher.js";

export const mcpRouter = Router();

/**
 * État de l'orchestration MCP (admin) : serveurs configurés + sonde de santé
 * (listTools) en parallèle, avec latence. Utile pour vérifier le câblage.
 */
mcpRouter.get("/mcp/status", requireAuth, requireRole("admin"), async (_req, res) => {
  const configured = mcpServers().map((s) => s.name);
  const health = await probeServers();
  res.json({ configured, health });
});
