import { PageHeader } from "../components/ui";
import { GLOSSARY } from "../lib/vocab";

/** Glossaire : chaque terme technique traduit en langage métier + définition. */
export function GlossaryPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Aide"
        title="Glossaire"
        subtitle="Les termes d'Aperio expliqués simplement. Le mode simple utilise les libellés métier ; le mode expert affiche les termes techniques."
      />

      <dl className="space-y-3">
        {GLOSSARY.map((t) => (
          <div key={t.key} className="pm-card p-5">
            <dt className="flex flex-wrap items-baseline gap-2">
              <span className="font-semibold text-white">{t.plain}</span>
              {t.plain !== t.technical && (
                <span className="font-mono text-xs text-slate-500">({t.technical})</span>
              )}
            </dt>
            <dd className="mt-1 text-sm text-slate-400">{t.definition}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
