import { useMemo, useState, type FormEvent } from "react";
import ReactFlow, { Background, Controls, MarkerType, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";
import type { PortfolioMap } from "@projectmaster/shared";
import { api, toErrorMessage } from "../api/client";
import { PageHeader, Loading, ErrorBanner } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { useProjects } from "../hooks/ProjectsContext";
import { BlockNode } from "../components/portfolio/BlockNode";
import { BlockPanel } from "../components/portfolio/BlockPanel";
import { layoutGraph } from "../components/portfolio/portfolioLayout";

const nodeTypes = { block: BlockNode };

export function PortfolioMapPage() {
  const { projects } = useProjects();
  const [projectId, setProjectId] = useState("");
  const [onlyAtRisk, setOnlyAtRisk] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [manage, setManage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const q = new URLSearchParams();
  if (projectId) q.set("projectId", projectId);
  if (onlyAtRisk) q.set("onlyAtRisk", "true");
  const map = useAsync<PortfolioMap>(
    () => api.get<PortfolioMap>(`/portfolio/map?${q.toString()}`),
    [projectId, onlyAtRisk],
  );

  // Positions calculées une fois par jeu de données (dagre, gauche→droite).
  const positioned = useMemo(() => {
    const data = map.data;
    if (!data) return { nodes: [] as Node[], edges: [] as Edge[] };
    const rawNodes: Node[] = data.blocks.map((b) => ({
      id: b.id,
      type: "block",
      data: { block: b },
      position: { x: 0, y: 0 },
    }));
    const edges: Edge[] = data.links.map((l) => ({
      id: l.id,
      source: l.fromId,
      target: l.toId,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: "rgb(148 163 184)" },
    }));
    return { nodes: layoutGraph(rawNodes, edges), edges };
  }, [map.data]);

  const nodes = useMemo(
    () => positioned.nodes.map((n) => ({ ...n, data: { ...n.data, selected: n.id === selectedId } })),
    [positioned, selectedId],
  );

  const selected = map.data?.blocks.find((b) => b.id === selectedId) ?? null;
  const reload = () => void map.reload();

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      reload();
    } catch (err) {
      setError(toErrorMessage(err));
    }
  };

  if (map.loading && !map.data) return <Loading />;
  const data = map.data;
  const redTone = (data?.blockers.length ?? 0) > 0;

  return (
    <div>
      <PageHeader
        eyebrow="Portefeuille"
        title="Carte du portefeuille"
        subtitle="Les briques, leurs dépendances et leur état — lisible en un coup d'œil."
      />

      {/* Bandeau : une phrase */}
      {data && (
        <div
          className={`pm-card mb-4 flex items-center gap-2 p-4 text-sm font-medium ${
            redTone ? "text-danger" : "text-success"
          }`}
        >
          <span aria-hidden="true">{redTone ? "■" : "●"}</span>
          {data.headline}
        </div>
      )}

      {/* Avertissements (cycles) */}
      {data && data.warnings.length > 0 && (
        <div className="pm-card mb-4 p-3 text-xs text-warning">
          {data.warnings.map((w, i) => (
            <div key={i}>⚠ {w}</div>
          ))}
        </div>
      )}

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      {/* Barre d'outils / filtres */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col">
          <span className="pm-label">Projet</span>
          <select className="pm-input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">Tous les projets</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2.5 text-sm text-fg">
          <input type="checkbox" checked={onlyAtRisk} onChange={(e) => setOnlyAtRisk(e.target.checked)} />
          Orange ou rouge seulement
        </label>
        <div className="flex-1" />
        {projectId && (
          <button
            className="pm-btn-ghost"
            onClick={() => run(() => api.post(`/portfolio/import?projectId=${projectId}`))}
          >
            ⟲ Importer depuis le connecteur
          </button>
        )}
        <button className="pm-btn-ghost" onClick={() => setManage((m) => !m)}>
          {manage ? "Fermer la gestion" : "Gérer les briques & liens"}
        </button>
      </div>

      {/* Graphe + panneau */}
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="relative h-[68vh] min-h-[460px] flex-1 overflow-hidden rounded-xl border border-line bg-surface2">
          {data && data.blocks.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted">
              Aucune brique. Ouvrez « Gérer les briques & liens » pour en créer, ou importez-les depuis un connecteur.
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={positioned.edges}
              nodeTypes={nodeTypes}
              onNodeClick={(_, n) => setSelectedId(n.id)}
              onPaneClick={() => setSelectedId(null)}
              nodesDraggable={false}
              nodesConnectable={false}
              fitView
              proOptions={{ hideAttribution: true }}
            >
              <Background />
              <Controls showInteractive={false} />
            </ReactFlow>
          )}
        </div>
        {selected && <BlockPanel block={selected} onClose={() => setSelectedId(null)} />}
      </div>

      {manage && data && (
        <ManagePanel
          projects={projects}
          blocks={data.blocks}
          links={data.links}
          onChanged={reload}
          onError={setError}
        />
      )}
    </div>
  );
}

// ─── Gestion (création briques / liens) — section repliable ──────────────────
function ManagePanel({
  projects,
  blocks,
  links,
  onChanged,
  onError,
}: {
  projects: { id: string; name: string }[];
  blocks: PortfolioMap["blocks"];
  links: PortfolioMap["links"];
  onChanged: () => void;
  onError: (m: string) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState("application");
  const [bProject, setBProject] = useState(projects[0]?.id ?? "");
  const [targetDate, setTargetDate] = useState("");
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");

  const guard = async (fn: () => Promise<unknown>) => {
    onError("");
    try {
      await fn();
      onChanged();
    } catch (err) {
      onError(toErrorMessage(err));
    }
  };

  const addBlock = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !bProject) return;
    void guard(async () => {
      await api.post("/portfolio/blocks", {
        projectId: bProject,
        name: name.trim(),
        type: type.trim() || "brique",
        targetDate: targetDate || undefined,
      });
      setName("");
      setTargetDate("");
    });
  };

  const addLink = (e: FormEvent) => {
    e.preventDefault();
    if (!fromId || !toId) return;
    void guard(async () => {
      await api.post("/portfolio/links", { fromId, toId });
      setFromId("");
      setToId("");
    });
  };

  return (
    <div className="pm-card mt-4 grid gap-6 p-5 sm:grid-cols-2">
      <form onSubmit={addBlock}>
        <h3 className="text-sm font-semibold text-heading">Ajouter une brique</h3>
        <label className="mt-3 block"><span className="pm-label">Nom</span>
          <input className="pm-input" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block"><span className="pm-label">Type</span>
            <input className="pm-input" value={type} onChange={(e) => setType(e.target.value)} placeholder="API, application, lot…" />
          </label>
          <label className="block"><span className="pm-label">Date cible</span>
            <input type="date" className="pm-input" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </label>
        </div>
        <label className="mt-3 block"><span className="pm-label">Projet</span>
          <select className="pm-input" value={bProject} onChange={(e) => setBProject(e.target.value)}>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <button className="pm-btn-primary mt-4">+ Créer la brique</button>
      </form>

      <form onSubmit={addLink}>
        <h3 className="text-sm font-semibold text-heading">Ajouter une dépendance</h3>
        <p className="mt-1 text-xs text-muted">La première brique <b>dépend de</b> la seconde.</p>
        <label className="mt-3 block"><span className="pm-label">Brique dépendante</span>
          <select className="pm-input" value={fromId} onChange={(e) => setFromId(e.target.value)}>
            <option value="">—</option>
            {blocks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label className="mt-3 block"><span className="pm-label">Dépend de</span>
          <select className="pm-input" value={toId} onChange={(e) => setToId(e.target.value)}>
            <option value="">—</option>
            {blocks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <button className="pm-btn-primary mt-4">+ Créer le lien</button>

        {links.length > 0 && (
          <div className="mt-4">
            <div className="pm-label">Liens existants</div>
            <ul className="mt-1 space-y-1 text-sm">
              {links.map((l) => {
                const f = blocks.find((b) => b.id === l.fromId)?.name ?? "?";
                const t = blocks.find((b) => b.id === l.toId)?.name ?? "?";
                return (
                  <li key={l.id} className="flex items-center justify-between gap-2">
                    <span className="truncate text-fg">{f} → {t}</span>
                    <button
                      className="pm-btn-ghost py-0.5 text-xs"
                      onClick={() => void guard(() => api.del(`/portfolio/links/${l.id}`))}
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </form>
    </div>
  );
}
