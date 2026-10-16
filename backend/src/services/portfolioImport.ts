import type { BlockSource } from "@projectmaster/shared";

/** Providers d'où l'on peut importer des briques. */
export type ImportProvider = "github" | "gitlab" | "jira" | "linear";

export interface ImportedBlockFields {
  sourceRef: string;
  name: string;
  type: string;
  targetDate: string | null;
  sourceUrl: string | null;
}

interface SignalPayload {
  key?: string | number;
  number?: number;
  title?: string;
  due?: string | null;
}

/** Normalise une date "YYYY-MM-DD" (ou début d'ISO) ou null. */
function normalizeDate(due: unknown): string | null {
  if (typeof due !== "string") return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(due);
  return m ? m[1] : null;
}

/** Construit l'URL externe « Ouvrir dans … » (ou null si indisponible). */
function buildUrl(
  provider: ImportProvider,
  settings: Record<string, string>,
  ref: string,
  isPR: boolean,
): string | null {
  switch (provider) {
    case "github": {
      const repo = settings.repo;
      return repo ? `https://github.com/${repo}/${isPR ? "pull" : "issues"}/${ref}` : null;
    }
    case "gitlab": {
      const host = (settings.host || "https://gitlab.com").replace(/\/$/, "");
      const pid = settings.projectId;
      return pid ? `${host}/${pid}/-/${isPR ? "merge_requests" : "issues"}/${ref}` : null;
    }
    case "jira": {
      const host = (settings.host || "").replace(/\/$/, "");
      return host ? `${host}/browse/${ref}` : null;
    }
    case "linear":
      // Pas de slug d'espace disponible → pas de lien direct fiable.
      return null;
  }
}

/**
 * Mapper PUR : un signal (issue / pull_request) → les champs d'une brique
 * importée (référence, nom, type, date cible, URL externe). Null si le signal
 * ne porte pas d'identifiant exploitable.
 */
export function mapImportedBlock(
  provider: ImportProvider,
  settings: Record<string, string>,
  signal: { type: string; payload?: Record<string, unknown> },
): ImportedBlockFields | null {
  const p = (signal.payload ?? {}) as SignalPayload;
  const ref =
    p.key != null ? String(p.key) : p.number != null ? String(p.number) : null;
  if (!ref) return null;

  const isPR = signal.type === "pull_request";
  return {
    sourceRef: ref,
    name: String(p.title ?? ref).slice(0, 200),
    type: isPR ? "PR" : "issue",
    targetDate: normalizeDate(p.due),
    sourceUrl: buildUrl(provider, settings, ref, isPR),
  };
}

/** Vrai si le provider sait produire des briques. */
export function isImportableProvider(p: string): p is ImportProvider {
  return p === "github" || p === "gitlab" || p === "jira" || p === "linear";
}

/** Le provider devient la source de la brique (toujours un BlockSource valide). */
export function providerToSource(p: ImportProvider): BlockSource {
  return p;
}
