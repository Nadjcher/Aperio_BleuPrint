import type { ReactNode } from "react";

/** Indicateur de chargement (texte discret, cohérent partout). */
export function Loading({ label = "Chargement…" }: { label?: string }) {
  return (
    <p className="text-sm text-slate-400" role="status" aria-live="polite">
      {label}
    </p>
  );
}

/** Bannière d'erreur accessible (role=alert). */
export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-200"
    >
      {message}
    </p>
  );
}

/** État vide utile : explique pourquoi l'écran est vide + action éventuelle. */
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="pm-card p-8 text-center">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {children && <p className="mx-auto mt-1 max-w-xl text-sm text-slate-400">{children}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
