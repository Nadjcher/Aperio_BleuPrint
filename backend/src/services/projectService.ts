import { AppDataSource } from "../db/data-source.js";
import { Project } from "../entities/Project.js";
import { AppError } from "../errors/index.js";

const projects = () => AppDataSource.getRepository(Project);

/** Projet appartenant au propriétaire, ou null. */
export async function getOwnedProjectOrNull(
  ownerId: string,
  projectId: string,
): Promise<Project | null> {
  return projects().findOne({ where: { id: projectId, ownerId } });
}

/**
 * Projet appartenant au propriétaire, ou 404. Point unique de vérification de
 * propriété (remplace les helpers `ownedProject` dupliqués dans les routes).
 */
export async function getOwnedProject(
  ownerId: string,
  projectId: string,
): Promise<Project> {
  const p = await getOwnedProjectOrNull(ownerId, projectId);
  if (!p) throw new AppError(404, "not_found", "Projet introuvable");
  return p;
}
