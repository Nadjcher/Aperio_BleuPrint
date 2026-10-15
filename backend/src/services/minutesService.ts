import type { MeetingMinutes, MinutesAction } from "@projectmaster/shared";
import { AppDataSource } from "../db/data-source.js";
import { Minutes } from "../entities/Minutes.js";
import { AppError } from "../errors/index.js";
import { complete, extractJson, isLLMEnabled } from "../llm/index.js";

const repo = () => AppDataSource.getRepository(Minutes);

/** Longueur max de notes envoyées au LLM (maîtrise du coût / des jetons). */
const MAX_INPUT = 20_000;

export interface ExtractedMinutes {
  summary: string;
  decisions: string[];
  actions: MinutesAction[];
  risks: string[];
  openQuestions: string[];
}

function toDTO(m: Minutes): MeetingMinutes {
  return {
    id: m.id,
    projectId: m.projectId,
    title: m.title,
    summary: m.summary,
    decisions: m.decisions ?? [],
    actions: m.actions ?? [],
    risks: m.risks ?? [],
    openQuestions: m.openQuestions ?? [],
    generatedBy: m.generatedBy,
    createdAt: m.createdAt.toISOString(),
  };
}

// ─── Extraction heuristique (déterministe, sans LLM) ─────────────────────────

const RE_QUESTION = /\?|à clarifier|à confirmer|à définir|en suspens|reste à/i;
const RE_RISK = /risqu|bloquant|bloqueur|danger|menace|retard|dérapage|dépassement|alerte/i;
const RE_DECISION = /décid|décision|validé|validation|retenu|acté|convenu|approuv|tranché|choix de/i;
const RE_ACTION = /action|à faire|\btodo\b|tâche|responsable|assigné|doit\b|chargé de|prendre en charge|relanc|préparer|envoyer|planifier/i;

/** Nettoie une puce : retire les marqueurs de liste en tête. */
function stripBullet(line: string): string {
  return line.replace(/^\s*(?:[-*•–]|\d+[.)])\s*/, "").trim();
}

/** Tente d'extraire un responsable d'une ligne d'action. */
function extractOwner(line: string): string | null {
  const at = line.match(/@([\wÀ-ÿ.-]{2,40})/);
  if (at) return at[1];
  const resp = line.match(/(?:responsable|assigné\s*(?:à|:)|chargé de|owner)\s*:?\s*([\p{L}][\p{L} .'-]{1,40})/iu);
  if (resp) return resp[1].trim();
  const brackets = line.match(/[[(]([\p{L}][\p{L} .'-]{1,40})[\])]/u);
  if (brackets) return brackets[1].trim();
  return null;
}

/** Tente d'extraire une échéance (date ou « avant le … »). */
function extractDue(line: string): string | null {
  const iso = line.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];
  const fr = line.match(/\b(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/);
  if (fr) return fr[1];
  const avant = line.match(/\bavant\s+(?:le\s+)?([\p{L}\d][\p{L}\d .'-]{2,30})/iu);
  if (avant) return avant[1].trim();
  return null;
}

/** Résumé déterministe : 2 premières phrases, borné. */
function heuristicSummary(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "Compte rendu de réunion.";
  const sentences = clean.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
  const s = sentences || clean;
  return s.length > 400 ? s.slice(0, 400).trimEnd() + "…" : s;
}

/**
 * Extraction PURE : classe chaque ligne des notes en décision / action /
 * risque / question selon des mots-clés. Déterministe et testable ; sert de
 * repli quand aucun LLM n'est configuré.
 */
export function heuristicMinutes(text: string): ExtractedMinutes {
  const decisions: string[] = [];
  const actions: MinutesAction[] = [];
  const risks: string[] = [];
  const openQuestions: string[] = [];

  for (const raw of text.split(/\r?\n/)) {
    const line = stripBullet(raw);
    if (line.length < 3) continue;
    // Priorité : question > risque > décision > action (une ligne, une rubrique).
    if (RE_QUESTION.test(line)) {
      openQuestions.push(line);
    } else if (RE_RISK.test(line)) {
      risks.push(line);
    } else if (RE_DECISION.test(line)) {
      decisions.push(line);
    } else if (RE_ACTION.test(line)) {
      actions.push({ description: line, owner: extractOwner(line), due: extractDue(line) });
    }
  }

  return {
    summary: heuristicSummary(text),
    decisions,
    actions,
    risks,
    openQuestions,
  };
}

// ─── Chemin LLM ──────────────────────────────────────────────────────────────

function minutesPrompt(title: string, text: string): { system: string; user: string } {
  const system =
    "Tu es l'assistant d'un chef de projet. À partir de notes de réunion brutes, " +
    "tu produis un compte rendu structuré, concis et factuel, en français. " +
    "N'invente rien : si une information est absente, laisse le champ vide. " +
    "Réponds UNIQUEMENT par un objet JSON valide, sans texte autour ni balises Markdown.";
  const user =
    `Réunion : « ${title} ».\n\n` +
    `Notes :\n"""\n${text.slice(0, MAX_INPUT)}\n"""\n\n` +
    `Renvoie EXACTEMENT ce format :\n` +
    `{\n` +
    `  "summary": "résumé en 2-3 phrases",\n` +
    `  "decisions": ["décision 1", "..."],\n` +
    `  "actions": [{"description": "action", "owner": "responsable ou null", "due": "échéance ou null"}],\n` +
    `  "risks": ["risque ou point d'alerte", "..."],\n` +
    `  "openQuestions": ["question ouverte", "..."]\n` +
    `}`;
  return { system, user };
}

function sanitizeStrings(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter((x) => x.length > 0)
    .slice(0, 50);
}

function sanitizeActions(v: unknown): MinutesAction[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x): MinutesAction | null => {
      if (!x || typeof x !== "object") return null;
      const o = x as Record<string, unknown>;
      const description = typeof o.description === "string" ? o.description.trim() : "";
      if (!description) return null;
      const owner = typeof o.owner === "string" && o.owner.trim() ? o.owner.trim() : null;
      const due = typeof o.due === "string" && o.due.trim() ? o.due.trim() : null;
      return { description, owner, due };
    })
    .filter((a): a is MinutesAction => a !== null)
    .slice(0, 50);
}

/** Normalise une sortie LLM potentiellement imparfaite. */
function fromLLM(parsed: Record<string, unknown>): ExtractedMinutes {
  return {
    summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
    decisions: sanitizeStrings(parsed.decisions),
    actions: sanitizeActions(parsed.actions),
    risks: sanitizeStrings(parsed.risks),
    openQuestions: sanitizeStrings(parsed.openQuestions),
  };
}

// ─── Génération + persistance ────────────────────────────────────────────────

/** Génère un compte rendu à partir de notes et le stocke. */
export async function generateMinutes(
  projectId: string,
  title: string,
  text: string,
): Promise<MeetingMinutes> {
  if (!text.trim()) throw new AppError(400, "empty_notes", "Notes de réunion vides");

  let extracted: ExtractedMinutes | null = null;
  let generatedBy: "llm" | "heuristic" = "heuristic";

  if (isLLMEnabled()) {
    const { system, user } = minutesPrompt(title, text);
    const raw = await complete({ system, user, maxTokens: 1500 });
    const parsed = extractJson<Record<string, unknown>>(raw);
    if (parsed) {
      const fromModel = fromLLM(parsed);
      // On n'accepte le résultat LLM que s'il a au moins un résumé.
      if (fromModel.summary) {
        extracted = fromModel;
        generatedBy = "llm";
      }
    }
  }

  if (!extracted) extracted = heuristicMinutes(text);
  // Garantit un résumé même si l'extraction n'en a pas produit.
  if (!extracted.summary) extracted.summary = heuristicSummary(text);

  const saved = await repo().save(
    repo().create({
      projectId,
      title: title.trim() || "Réunion",
      summary: extracted.summary,
      decisions: extracted.decisions,
      actions: extracted.actions,
      risks: extracted.risks,
      openQuestions: extracted.openQuestions,
      generatedBy,
    }),
  );
  return toDTO(saved);
}

export async function listMinutes(projectId: string): Promise<MeetingMinutes[]> {
  const rows = await repo().find({ where: { projectId }, order: { createdAt: "DESC" }, take: 100 });
  return rows.map(toDTO);
}

export async function getMinutes(projectId: string, id: string): Promise<MeetingMinutes> {
  const row = await repo().findOne({ where: { id, projectId } });
  if (!row) throw new AppError(404, "not_found", "Compte rendu introuvable");
  return toDTO(row);
}

export async function deleteMinutes(projectId: string, id: string): Promise<void> {
  const res = await repo().delete({ id, projectId });
  if (!res.affected) throw new AppError(404, "not_found", "Compte rendu introuvable");
}
