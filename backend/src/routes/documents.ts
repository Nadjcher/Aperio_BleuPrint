import { Router } from "express";
import express from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validateBody } from "../middleware/validate.js";
import { getOwnedProject } from "../services/projectService.js";
import { importDocument } from "../services/documentService.js";
import { audit, anonymizeIp } from "../services/auditService.js";
import { AppError } from "../errors/index.js";

export const documentsRouter = Router();

/** Taille max du fichier décodé (octets). Spécifications, comptes-rendus… */
const MAX_FILE_BYTES = 6 * 1024 * 1024;

const importSchema = z.object({
  filename: z.string().min(1).max(255),
  kind: z.enum(["pdf", "docx"]),
  // Fichier encodé en base64 (le front lit le fichier localement).
  contentBase64: z.string().min(1),
});

documentsRouter.post(
  "/projects/:id/documents",
  // Parser dédié à plus haute limite (monté avant le parser global 1 Mo).
  express.json({ limit: "8mb" }),
  requireAuth,
  requireRole("manager"),
  validateBody(importSchema),
  async (req, res) => {
    const { id } = req.params as { id: string };
    await getOwnedProject(req.user!.sub, id);

    const { filename, kind, contentBase64 } = req.body as z.infer<typeof importSchema>;
    const buffer = Buffer.from(contentBase64, "base64");
    if (buffer.length === 0) throw new AppError(400, "invalid_file", "Fichier illisible");
    if (buffer.length > MAX_FILE_BYTES) {
      throw new AppError(413, "file_too_large", "Fichier trop volumineux (max 6 Mo)");
    }

    const result = await importDocument(id, { filename, kind, buffer });
    await audit({
      actorId: req.user!.sub,
      action: "document.import",
      target: `project:${id}`,
      ip: anonymizeIp(req.ip),
      metadata: { kind },
    });
    res.status(201).json(result);
  },
);
