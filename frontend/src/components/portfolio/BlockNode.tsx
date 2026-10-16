import { memo } from "react";
import { Handle, Position } from "reactflow";
import type { BlockState, BlockWithState } from "@projectmaster/shared";
import { BLOCK_STATE_META } from "@projectmaster/shared";

/** Couleurs par état (token sémantique). L'état est aussi porté par l'icône + le libellé. */
const STATE_STYLE: Record<BlockState, { ring: string; text: string }> = {
  vert: { ring: "ring-success/50", text: "text-success" },
  orange: { ring: "ring-warning/60", text: "text-warning" },
  rouge: { ring: "ring-danger/60", text: "text-danger" },
};

interface Data {
  block: BlockWithState;
  selected?: boolean;
}

/** Nœud « brique » : état porté par couleur + icône + libellé (WCAG 1.4.1). */
export const BlockNode = memo(function BlockNode({ data }: { data: Data }) {
  const b = data.block;
  const s = STATE_STYLE[b.state];
  const meta = BLOCK_STATE_META[b.state];
  return (
    <div
      className={`w-[196px] rounded-lg border border-line bg-surface px-3 py-2 ring-2 ${s.ring} ${
        data.selected ? "shadow-glow" : "shadow-sm"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !bg-muted" />
      <div className="flex items-center gap-1.5">
        <span aria-hidden="true" className={`text-xs ${s.text}`}>{meta.icon}</span>
        <span className="truncate text-sm font-semibold text-heading">{b.name}</span>
      </div>
      <div className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-wide text-faint">
        {b.type}
      </div>
      <div className={`mt-1 text-[11px] font-medium ${s.text}`}>
        {meta.label}
        {b.bloque > 0 && <span className="text-muted"> · bloque {b.bloque}</span>}
      </div>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !bg-muted" />
    </div>
  );
});
