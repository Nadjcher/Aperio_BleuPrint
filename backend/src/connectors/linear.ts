import type { IngestSignal } from "../services/signalService.js";
import { AppError } from "../errors/index.js";
import type { Connector, ConnectorContext } from "./types.js";
import { httpJson } from "./types.js";

export interface LinearIssueNode {
  identifier: string;
  title: string;
  createdAt: string;
  state?: { name: string } | null;
  creator?: { name: string } | null;
}
export interface LinearResponse {
  data?: { issues?: { nodes: LinearIssueNode[] } };
}

/** Mapper PUR : issues Linear → signaux normalisés (testable). */
export function mapLinear(projectId: string, nodes: LinearIssueNode[]): IngestSignal[] {
  return nodes.map((n) => ({
    projectId,
    source: "linear" as const,
    type: "issue" as const,
    occurredAt: new Date(n.createdAt),
    actor: n.creator?.name ?? null,
    payload: { key: n.identifier, title: n.title, state: n.state?.name ?? "unknown" },
  }));
}

const QUERY = `query($teamId: String!) {
  issues(filter: { team: { id: { eq: $teamId } } }, first: 100, orderBy: createdAt) {
    nodes { identifier title createdAt state { name } creator { name } }
  }
}`;

export const linearConnector: Connector = {
  provider: "linear",
  async fetchSignals(ctx: ConnectorContext): Promise<IngestSignal[]> {
    const { teamId } = ctx.settings;
    if (!teamId) throw new AppError(400, "invalid_config", "teamId Linear requis");
    if (!ctx.token) throw new AppError(400, "no_token", "Token Linear requis");
    const data = await httpJson<LinearResponse>(
      "https://api.linear.app/graphql",
      {
        method: "POST",
        headers: { Authorization: ctx.token, "Content-Type": "application/json" },
        body: JSON.stringify({ query: QUERY, variables: { teamId } }),
      },
      "linear",
    );
    return mapLinear(ctx.projectId, data.data?.issues?.nodes ?? []);
  },
};
