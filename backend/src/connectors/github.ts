import type { IngestSignal } from "../services/signalService.js";
import { env } from "../config/env.js";
import { AppError } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";

/**
 * Connecteur GitHub (lecture seule) : transforme l'activité d'un dépôt en
 * signaux normalisés. Phase 1 du blueprint.
 */

interface GitHubCommit {
  sha: string;
  commit: { author: { date: string } | null; message: string };
  author: { login: string } | null;
}

interface GitHubPull {
  number: number;
  title: string;
  state: string;
  created_at: string;
  user: { login: string } | null;
}

interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  created_at: string;
  user: { login: string } | null;
  pull_request?: unknown;
}

async function gh<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "projectmaster",
  };
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;

  const res = await fetch(`${env.GITHUB_API_URL}${path}`, { headers });
  if (!res.ok) {
    logger.warn({ path, status: res.status }, "Appel GitHub en échec");
    throw new AppError(
      502,
      "github_error",
      `GitHub a répondu ${res.status} pour ${path}`,
    );
  }
  return (await res.json()) as T;
}

function parseRepo(repo: string): { owner: string; name: string } {
  const [owner, name] = repo.split("/");
  if (!owner || !name) {
    throw new AppError(400, "invalid_repo", "Format attendu : owner/repo");
  }
  return { owner, name };
}

/** Récupère l'activité récente d'un dépôt et la convertit en signaux. */
export async function fetchRepoSignals(
  projectId: string,
  repo: string,
): Promise<IngestSignal[]> {
  const { owner, name } = parseRepo(repo);
  const base = `/repos/${owner}/${name}`;

  const [commits, pulls, issues] = await Promise.all([
    gh<GitHubCommit[]>(`${base}/commits?per_page=100`),
    gh<GitHubPull[]>(`${base}/pulls?state=all&per_page=100`),
    gh<GitHubIssue[]>(`${base}/issues?state=all&per_page=100`),
  ]);

  const signals: IngestSignal[] = [];

  for (const c of commits) {
    signals.push({
      projectId,
      source: "github",
      type: "commit",
      occurredAt: new Date(c.commit.author?.date ?? Date.now()),
      actor: c.author?.login ?? null,
      payload: { sha: c.sha, message: c.commit.message.slice(0, 200) },
    });
  }

  for (const p of pulls) {
    signals.push({
      projectId,
      source: "github",
      type: "pull_request",
      occurredAt: new Date(p.created_at),
      actor: p.user?.login ?? null,
      payload: { number: p.number, title: p.title, state: p.state },
    });
  }

  for (const i of issues) {
    // L'endpoint issues inclut les PR : on les écarte.
    if (i.pull_request) continue;
    signals.push({
      projectId,
      source: "github",
      type: "issue",
      occurredAt: new Date(i.created_at),
      actor: i.user?.login ?? null,
      payload: { number: i.number, title: i.title, state: i.state },
    });
  }

  return signals;
}
