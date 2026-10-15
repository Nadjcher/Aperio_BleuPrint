import type { ConnectorConfig as ConnectorConfigDTO, ConnectorProvider } from "@projectmaster/shared";
import { AppDataSource } from "../db/data-source.js";
import { ConnectorConfig } from "../entities/ConnectorConfig.js";
import { AppError } from "../errors/index.js";
import { encryptField, decryptField } from "../utils/crypto.js";
import type { ConnectorContext } from "../connectors/index.js";

const repo = () => AppDataSource.getRepository(ConnectorConfig);

/** DTO sans le token (on expose seulement `hasToken`). */
function toDTO(c: ConnectorConfig): ConnectorConfigDTO {
  return {
    projectId: c.projectId,
    provider: c.provider,
    settings: c.settings,
    hasToken: Boolean(c.tokenEnc),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export async function getConfig(projectId: string): Promise<ConnectorConfigDTO | null> {
  const c = await repo().findOne({ where: { projectId } });
  return c ? toDTO(c) : null;
}

/**
 * Crée/remplace la config connecteur d'un projet. Le token (optionnel) est
 * chiffré au repos ; s'il n'est pas fourni, on conserve le token existant.
 */
export async function upsertConfig(
  projectId: string,
  data: { provider: ConnectorProvider; settings: Record<string, string>; token?: string },
): Promise<ConnectorConfigDTO> {
  const existing = await repo().findOne({ where: { projectId } });
  const row = existing ?? repo().create({ projectId });
  row.provider = data.provider;
  row.settings = data.settings;
  if (data.token !== undefined) {
    row.tokenEnc = data.token ? encryptField(data.token) : null;
  }
  return toDTO(await repo().save(row));
}

export async function deleteConfig(projectId: string): Promise<void> {
  await repo().delete({ projectId });
}

/**
 * Contexte d'exécution (token déchiffré) pour le pipeline. Renvoie null si
 * aucun connecteur n'est configuré pour le projet.
 */
export async function resolveContext(
  projectId: string,
): Promise<{ provider: ConnectorProvider; ctx: ConnectorContext } | null> {
  const c = await repo().findOne({ where: { projectId } });
  if (!c) return null;
  let token: string | undefined;
  if (c.tokenEnc) {
    try {
      token = decryptField(c.tokenEnc);
    } catch {
      throw new AppError(500, "token_decrypt_failed", "Token du connecteur illisible");
    }
  }
  return { provider: c.provider, ctx: { projectId, settings: c.settings, token } };
}
