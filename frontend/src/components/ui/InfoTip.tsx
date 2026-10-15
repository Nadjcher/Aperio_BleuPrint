import { useId, useState, type ReactNode } from "react";
import { term } from "../../lib/vocab";

/**
 * Terme accompagné d'une infobulle explicative (au survol et au focus clavier).
 * Accessible : le déclencheur est un bouton avec aria-describedby.
 */
export function InfoTip({
  termKey,
  children,
}: {
  termKey: string;
  children?: ReactNode;
}) {
  const t = term(termKey);
  const id = useId();
  const [open, setOpen] = useState(false);
  if (!t) return <>{children}</>;

  const label = children ?? t.plain;
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        className="inline-flex items-center gap-1 border-b border-dotted border-slate-500 text-inherit"
        aria-describedby={open ? id : undefined}
        aria-label={`${typeof label === "string" ? label : t.plain} — définition`}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        <span aria-hidden className="text-[10px] text-faint">
          ⓘ
        </span>
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute left-0 top-full z-20 mt-1.5 w-64 rounded-lg border border-line bg-surface p-3 text-xs font-normal leading-relaxed text-fg shadow-xl"
        >
          <span className="mb-0.5 block font-semibold text-heading">{t.plain}</span>
          {t.definition}
        </span>
      )}
    </span>
  );
}
