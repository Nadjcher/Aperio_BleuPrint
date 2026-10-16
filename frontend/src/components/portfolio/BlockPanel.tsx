import type { BlockState, BlockWithState } from "@projectmaster/shared";
import { BLOCK_STATE_META } from "@projectmaster/shared";

const STATE_TEXT: Record<BlockState, string> = {
  vert: "text-success",
  orange: "text-warning",
  rouge: "text-danger",
};

/** Construit l'URL « Ouvrir dans … » à partir de la source et de la référence. */
function externalLink(b: BlockWithState): { label: string; href: string } | null {
  if (!b.sourceRef) return null;
  if (b.source === "github") {
    return { label: "Ouvrir dans GitHub", href: `https://github.com/${b.sourceRef}` };
  }
  if (b.source === "jira") {
    // La référence est une clé Jira (ex. ABC-123) ; lien de recherche générique.
    return { label: "Ouvrir dans Jira", href: `https://www.google.com/search?q=Jira+${encodeURIComponent(b.sourceRef)}` };
  }
  return null;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium text-heading">{value}</span>
    </div>
  );
}

export function BlockPanel({ block, onClose }: { block: BlockWithState; onClose: () => void }) {
  const meta = BLOCK_STATE_META[block.state];
  const link = externalLink(block);
  return (
    <aside className="pm-card w-full p-5 sm:w-80" aria-label={`Détail de la brique ${block.name}`}>
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-base font-semibold text-heading">{block.name}</h2>
        <button onClick={onClose} className="pm-btn-ghost py-1 text-xs" aria-label="Fermer">
          ✕
        </button>
      </div>
      <div className={`mt-1 text-sm font-medium ${STATE_TEXT[block.state]}`}>
        <span aria-hidden="true">{meta.icon}</span> {meta.label}
      </div>
      <p className="mt-1 text-sm text-muted">{block.reason}</p>

      <div className="mt-4 divide-y divide-line border-t border-line">
        <Row label="Type" value={block.type} />
        <Row label="Responsable" value={block.ownerName ?? "—"} />
        <Row label="Projet" value={block.projectName ?? "—"} />
        <Row label="Date cible" value={block.targetDate ?? "—"} />
        <Row
          label="Dernière activité"
          value={block.lastActivityAt ? new Date(block.lastActivityAt).toLocaleDateString("fr-FR") : "—"}
        />
        {block.bloque > 0 && <Row label="Briques bloquées" value={block.bloque} />}
      </div>

      {link && (
        <a href={link.href} target="_blank" rel="noreferrer" className="pm-btn-primary mt-4 w-full">
          {link.label} →
        </a>
      )}
    </aside>
  );
}
