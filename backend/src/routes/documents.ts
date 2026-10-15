import { Router } from "express";
import express from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validateBody } from "../middleware/validate.js";
import { getOwnedProject } from "../services/projectService.js";
import { importDocument, extractText } from "../services/documentService.js";
import { generateMinutes } from "../services/minutesService.js";
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

const minutesFromDocSchema = importSchema.extend({
  title: z.string().min(1).max(200).optional(),
});

/** Décode et valide un fichier base64 (taille bornée). */
function decodeFile(contentBase64: string): Buffer {
  const buffer = Buffer.from(contentBase64, "base64");
  if (buffer.length === 0) throw new AppError(400, "invalid_file", "Fichier illisible");
  if (buffer.length > MAX_FILE_BYTES) {
    throw new AppError(413, "file_too_large", "Fichier trop volumineux (max 6 Mo)");
  }
  return buffer;
}

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
    const buffer = decodeFile(contentBase64);

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

/**
 * Génère un compte rendu de réunion directement à partir d'un document
 * (PDF/Word) : on extrait le texte puis on le passe à l'agent compte rendu.
 * Même parser 8 Mo, monté avant le parser JSON global.
 */
documentsRouter.post(
  "/projects/:id/minutes/from-document",
  express.json({ limit: "8mb" }),
  requireAuth,
  requireRole("manager"),
  validateBody(minutesFromDocSchema),
  async (req, res) => {
    const { id } = req.params as { id: string };
    await getOwnedProject(req.user!.sub, id);

    const { filename, kind, contentBase64, title } = req.body as z.infer<typeof minutesFromDocSchema>;
    const buffer = decodeFile(contentBase64);

    const text = await extractText(kind, buffer);
    if (!text.trim()) {
      throw new AppError(422, "empty_document", "Le document ne contient pas de texte exploitable");
    }

    // Titre par défaut : nom du fichier sans extension.
    const fallbackTitle = filename.replace(/\.[^.]+$/, "").slice(0, 200) || "Réunion";
    const minutes = await generateMinutes(id, title?.trim() || fallbackTitle, text);
    await audit({
      actorId: req.user!.sub,
      action: "minutes.from_document",
      target: `project:${id}`,
      ip: anonymizeIp(req.ip),
      metadata: { kind, by: minutes.generatedBy },
    });
    res.status(201).json(minutes);
  },
);
