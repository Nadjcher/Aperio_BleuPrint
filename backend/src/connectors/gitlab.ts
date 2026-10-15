import type { IngestSignal } from "../services/signalService.js";
import { AppError } from "../errors/index.js";
import type { Connector, ConnectorContext } from "./types.js";
import { httpJson } from "./types.js";

export interface GitLabCommit {
  id: string;
  created_at: string;
  title: string;
  author_name?: string | null;
}
export interface GitLabMr {
  iid: number;
  title: string;
  state: string;
  created_at: string;
  author?: { username: string } | null;
}
export interface GitLabIssue {
  iid: number;
  title: string;
  state: string;
  created_at: string;
  author?: { username: string } | null;
}

/** Mapper PUR : données GitLab → signaux normalisés (testable). */
export function mapGitlab(
  projectId: string,
  data: { commits: GitLabCommit[]; mergeRequests: GitLabMr[]; issues: GitLabIssue[] },
): IngestSignal[] {
  const signals: IngestSignal[] = [];
  for (const c of data.commits) {
    signals.push({
      projectId,
      source: "gitlab",
      type: "commit",
      occurredAt: new Date(c.created_at),
      actor: c.author_name ?? null,
      payload: { sha: c.id, message: c.title.slice(0, 200) },
    });
  }
  for (const m of data.mergeRequests) {
    signals.push({
      projectId,
      source: "gitlab",
      type: "pull_request",
      occurredAt: new Date(m.created_at),
      actor: m.author?.username ?? null,
      payload: { number: m.iid, title: m.title, state: m.state },
    });
  }
  for (const i of data.issues) {
    signals.push({
      projectId,
      source: "gitlab",
      type: "issue",
      occurredAt: new Date(i.created_at),
      actor: i.author?.username ?? null,
      payload: { number: i.iid, title: i.title, state: i.state },
    });
  }
  return signals;
}

export const gitlabConnector: Connector = {
  provider: "gitlab",
  async fetchSignals(ctx: ConnectorContext): Promise<IngestSignal[]> {
    const host = (ctx.settings.host || "https://gitlab.com").replace(/\/$/, "");
    const projectId = ctx.settings.projectId;
    if (!projectId) throw new AppError(400, "invalid_config", "projectId GitLab manquant");
    if (!ctx.token) throw new AppError(400, "no_token", "Token GitLab requis");
    const id = encodeURIComponent(projectId);
    const headers = { "PRIVATE-TOKEN": ctx.token };
    const base = `${host}/api/v4/projects/${id}`;
    const [commits, mergeRequests, issues] = await Promise.all([
      httpJson<GitLabCommit[]>(`${base}/repository/commits?per_page=100`, { headers }, "gitlab"),
      httpJson<GitLabMr[]>(`${base}/merge_requests?state=all&per_page=100`, { headers }, "gitlab"),
      httpJson<GitLabIssue[]>(`${base}/issues?per_page=100`, { headers }, "gitlab"),
    ]);
    return mapGitlab(ctx.projectId, { commits, mergeRequests, issues });
  },
};
