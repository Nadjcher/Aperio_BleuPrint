import type { ConnectorProvider } from "@projectmaster/shared";
import type { IngestSignal } from "../services/signalService.js";

/** Contexte d'exécution d'un connecteur pour un projet. */
export interface ConnectorContext {
  projectId: string;
  /** Paramètres spécifiques au provider (repo, host, projectKey, teamId…). */
  settings: Record<string, string>;
  /** Token déchiffré, si le provider en requiert un. */
  token?: string;
}

/** Interface commune à tous les connecteurs de sources de données. */
export interface Connector {
  provider: ConnectorProvider;
  /** Récupère l'activité récente et la convertit en signaux normalisés. */
  fetchSignals(ctx: ConnectorContext): Promise<IngestSignal[]>;
}

const DEFAULT_TIMEOUT_MS = 15_000;

/** Appel HTTP JSON générique avec timeout dur (mutualisé entre connecteurs). */
export async function httpJson<T>(
  url: string,
  init: RequestInit,
  provider: ConnectorProvider,
): Promise<T> {
  const { AppError } = await import("../errors/index.js");
  const { logger } = await import("../utils/logger.js");
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS) });
  } catch (err) {
    logger.warn({ provider, url, err }, "Connecteur injoignable (timeout/réseau)");
    throw new AppError(504, `${provider}_unreachable`, `${provider} injoignable`);
  }
  if (!res.ok) {
    logger.warn({ provider, url, status: res.status }, "Connecteur en échec");
    throw new AppError(502, `${provider}_error`, `${provider} a répondu ${res.status}`);
  }
  return (await res.json()) as T;
}
