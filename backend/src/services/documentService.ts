import mammoth from "mammoth";
import { extractText as pdfExtract, getDocumentProxy } from "unpdf";
import { AppError } from "../errors/index.js";
import type { IngestSignal } from "./signalService.js";

export type DocumentKind = "pdf" | "docx";

/** Longueur maximale d'extrait conservé (minimisation RGPD). */
export const MAX_EXCERPT = 20_000;

/** Normalise les blancs et tronque l'extrait conservé. */
function excerptOf(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > MAX_EXCERPT ? clean.slice(0, MAX_EXCERPT) : clean;
}

/**
 * Mapper PUR : un document importé → un signal normalisé (testable).
 * On ne conserve qu'un extrait borné, pas le fichier d'origine.
 */
export function mapDocument(
  projectId: string,
  doc: { filename: string; kind: DocumentKind; text: string; occurredAt?: Date },
): IngestSignal {
  const excerpt = excerptOf(doc.text);
  return {
    projectId,
    source: "document" as const,
    type: "document" as const,
    occurredAt: doc.occurredAt ?? new Date(),
    actor: null,
    payload: {
      title: doc.filename,
      kind: doc.kind,
      chars: excerpt.length,
      truncated: doc.text.replace(/\s+/g, " ").trim().length > MAX_EXCERPT,
      excerpt,
    },
  };
}

/** Extraction du texte brut selon le type de fichier. */
export async function extractText(kind: DocumentKind, buffer: Buffer): Promise<string> {
  try {
    if (kind === "pdf") {
      // unpdf embarque un pdfjs moderne, fiable et sans dépendance native.
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text } = await pdfExtract(pdf, { mergePages: true });
      return text ?? "";
    }
    const { value } = await mammoth.extractRawText({ buffer });
    return value ?? "";
  } catch {
    throw new AppError(422, "extract_failed", "Impossible d'extraire le texte du fichier");
  }
}

/** Importe un document : extrait le texte puis stocke un signal. */
export async function importDocument(
  projectId: string,
  doc: { filename: string; kind: DocumentKind; buffer: Buffer },
): Promise<{ title: string; chars: number; truncated: boolean }> {
  const text = await extractText(doc.kind, doc.buffer);
  if (!text.trim()) {
    throw new AppError(422, "empty_document", "Le document ne contient pas de texte exploitable");
  }
  const signal = mapDocument(projectId, { filename: doc.filename, kind: doc.kind, text });
  // Import paresseux : évite de charger la source de données (et sa config)
  // au simple chargement du module (mappers testables en isolation).
  const { ingest } = await import("./signalService.js");
  await ingest([signal]);
  const payload = signal.payload as { chars: number; truncated: boolean };
  return { title: doc.filename, chars: payload.chars, truncated: payload.truncated };
}
