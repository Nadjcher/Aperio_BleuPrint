import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { llmStatus, pingLLM } from "../llm/index.js";

export const llmRouter = Router();

/**
 * Diagnostic du LLM (sans secret) : quel provider est résolu, modèle, et si
 * clé/base URL sont présentes. Avec ?ping=1, effectue un appel réel minimal et
 * remonte l'erreur exacte (modèle décommissionné, clé invalide…). Authentifié.
 */
llmRouter.get("/llm/status", requireAuth, async (req, res) => {
  const status = llmStatus();
  if (req.query.ping === "1") {
    const ping = await pingLLM();
    res.json({ ...status, ping });
    return;
  }
  res.json(status);
});
