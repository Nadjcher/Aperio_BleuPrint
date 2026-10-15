import type { ConnectorProvider } from "@projectmaster/shared";
import type { Connector } from "./types.js";
import { githubConnector } from "./github.js";
import { gitlabConnector } from "./gitlab.js";
import { jiraConnector } from "./jira.js";
import { linearConnector } from "./linear.js";

const REGISTRY: Record<ConnectorProvider, Connector> = {
  github: githubConnector,
  gitlab: gitlabConnector,
  jira: jiraConnector,
  linear: linearConnector,
};

/** Résout le connecteur d'un provider. */
export function getConnector(provider: ConnectorProvider): Connector {
  return REGISTRY[provider];
}

export type { Connector, ConnectorContext } from "./types.js";
