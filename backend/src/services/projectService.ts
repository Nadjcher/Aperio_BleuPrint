import type { Project as ProjectDTO } from "@projectmaster/shared";
import { AppDataSource } from "../db/data-source.js";
import { Project } from "../entities/Project.js";
import { AppError } from "../errors/index.js";

const projects = () => AppDataSource.getRepository(Project);

/** Nombre max de projets en mode invité (au-delà : créer un compte). */
export const GUEST_PROJECT_LIMIT = 1;

export function projectToDTO(p: Project): ProjectDTO {
  return {
    id: p.id,
    name: p.name,
    repo: p.repo ?? undefined,
    createdAt: p.createdAt.toISOString(),
  };
}

/** Projets d'un propriétaire, les plus récents d'abord. */
export async function listProjects(ownerId: string): Promise<Project[]> {
  return projects().find({ where: { ownerId }, order: { createdAt: "DESC" } });
}

/**
 * Crée un projet. Applique la limite du mode invité (règle métier côté service,
 * pas côté route).
 */
export async function createProject(
  ownerId: string,
  isGuest: boolean,
  data: { name: string; repo?: string },
): Promise<Project> {
  if (isGuest) {
    const count = await projects().count({ where: { ownerId } });
    if (count >= GUEST_PROJECT_LIMIT) {
      throw new AppError(
        403,
        "guest_limit",
        "Limite du mode invité atteinte — créez un compte pour continuer",
      );
    }
  }
  return projects().save(
    projects().create({ name: data.name, repo: data.repo ?? null, ownerId }),
  );
}

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
