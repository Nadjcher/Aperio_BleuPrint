import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Paginated, Project } from "@projectmaster/shared";
import { api, toErrorMessage } from "../api/client";

interface ProjectsCtx {
  projects: Project[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const Ctx = createContext<ProjectsCtx | null>(null);

/**
 * Fournit la liste des projets une seule fois pour tout l'espace authentifié.
 * Évite les 3 fetchs indépendants de /projects (Dashboard, Projets, Équipe).
 */
export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.get<Paginated<Project>>("/projects");
      setProjects(r.items);
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo(
    () => ({ projects, loading, error, reload }),
    [projects, loading, error, reload],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProjects(): ProjectsCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProjects doit être utilisé dans <ProjectsProvider>");
  return ctx;
}
