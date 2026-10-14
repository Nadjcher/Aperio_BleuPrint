import type { ResourceMoveAnalysis } from "@projectmaster/shared";

/** Jauge de gravité 0..100 (vert → ambre → rouge), accessible (role=meter). */
export function GravityGauge({ score }: { score: number }) {
  const color = score > 50 ? "bg-red-500" : score >= 25 ? "bg-amber-400" : "bg-emerald-400";
  const label = score > 50 ? "Critique" : score >= 25 ? "Sensible" : "Faible";
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="pm-label">Score de gravité</span>
        <span className="font-mono text-sm text-slate-200">
          {score}/100 · {label}
        </span>
      </div>
      <div
        className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-white/10"
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Score de gravité ${score} sur 100`}
      >
        <div className={`h-full ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

const impactColor: Record<ResourceMoveAnalysis["netImpact"], string> = {
  positive: "text-emerald-300",
  neutral: "text-slate-300",
  negative: "text-red-300",
};

const impactLabel: Record<ResourceMoveAnalysis["netImpact"], string> = {
  positive: "positif",
  neutral: "neutre",
  negative: "négatif",
};

/** Panneau de résultat d'une simulation de déplacement de ressource. */
export function GravityResult({ analysis }: { analysis: ResourceMoveAnalysis }) {
  return (
    <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <GravityGauge score={analysis.gravityScore} />

      <p className="mt-4 text-sm text-slate-200">
        <span className="font-semibold">{analysis.member}</span> —{" "}
        <span className={impactColor[analysis.netImpact]}>
          impact net {impactLabel[analysis.netImpact]}
        </span>
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-white/5 p-4">
          <div className="pm-eyebrow">Projet source · {analysis.from.projectName}</div>
          <ul className="mt-2 space-y-1 text-sm text-slate-300">
            <li>
              Vélocité : {analysis.from.velocityBefore} →{" "}
              <span className="text-red-300">{analysis.from.velocityAfter}</span> (−
              {analysis.from.velocityLossPct}%)
            </li>
            <li>Durée estimée : +{analysis.from.durationIncreasePct}%</li>
            {analysis.from.skillsGap.length > 0 && (
              <li>
                Expertise perdue :{" "}
                {analysis.from.skillsGap.map((s) => (
                  <span key={s} className="pm-chip ml-1 text-xs">
                    {s}
                  </span>
                ))}
              </li>
            )}
          </ul>
        </div>

        {analysis.to && (
          <div className="rounded-lg border border-white/5 p-4">
            <div className="pm-eyebrow">Projet cible · {analysis.to.projectName}</div>
            <ul className="mt-2 space-y-1 text-sm text-slate-300">
              <li>
                Vélocité : {analysis.to.velocityBefore} →{" "}
                <span className="text-emerald-300">{analysis.to.velocityAfter}</span> (+
                {analysis.to.velocityGainPct}%)
              </li>
              <li>Pleinement effectif après ~{analysis.to.effectiveAfterWeeks} sem.</li>
            </ul>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-brand/20 bg-brand/5 p-4">
        <div className="pm-eyebrow">Recommandation</div>
        <p className="mt-1 text-sm text-slate-100">{analysis.recommendation}</p>
        <p className="mt-2 text-xs text-slate-500">
          Confiance : {Math.round(analysis.confidence * 100)}% ·{" "}
          {analysis.confidence < 0.5
            ? "données de vélocité insuffisantes, estimation indicative"
            : "basée sur les vélocités déclarées"}
        </p>
      </div>
    </div>
  );
}
