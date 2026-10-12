import { Link } from "react-router-dom";
import { tokenStore } from "../api/client";

const authed = Boolean(tokenStore.access);
const primaryTo = authed ? "/dashboard" : "/login";
const primaryLabel = authed ? "Ouvrir l'app" : "Commencer gratuitement";

/** Cartes « aperçu produit » dans le hero (ce que BluePrint fait). */
const previewCards = [
  { icon: "⚡", title: "Détecte", desc: "Signaux & anomalies en continu", tint: "from-brand-500 to-brand-400" },
  { icon: "🤖", title: "Agit", desc: "4 agents autonomes", tint: "from-accent-500 to-accent-600" },
  { icon: "📝", title: "Synthétise", desc: "Rapports IA prêts à partager", tint: "from-fuchsia-500 to-accent-600" },
  { icon: "🔒", title: "Protège", desc: "Sécurisé & RGPD", tint: "from-emerald-500 to-brand-400" },
];

/** Grille complète des fonctionnalités. */
const features = [
  { icon: "⚡", title: "Signaux en temps réel", desc: "Collecte continue de l'activité (commits, PRs, issues) via vos connecteurs.", tint: "from-brand-500 to-brand-400" },
  { icon: "📈", title: "Détection d'anomalies", desc: "Repère les dérapages avant qu'ils ne coûtent, par analyse statistique robuste.", tint: "from-cyan-500 to-brand-400" },
  { icon: "🤖", title: "4 agents autonomes", desc: "Monitor, Analyst, Planner, Reporter surveillent, diagnostiquent et agissent.", tint: "from-accent-500 to-accent-600" },
  { icon: "📝", title: "Synthèses par IA", desc: "Rapports hebdo et mensuels générés automatiquement, prêts à partager.", tint: "from-fuchsia-500 to-accent-600" },
  { icon: "🔒", title: "Sécurisé & RGPD", desc: "JWT, chiffrement au repos, export et effacement des données natifs.", tint: "from-emerald-500 to-brand-400" },
  { icon: "✓", title: "Simple à utiliser", desc: "Reliez un dépôt, cliquez sur Synchroniser : l'analyse et les agents font le reste.", tint: "from-brand-400 to-accent-500" },
];

const stats = [
  { value: "4", label: "agents autonomes" },
  { value: "90%+", label: "de précision" },
  { value: "< 5s", label: "par décision" },
  { value: "€0–15", label: "par mois" },
];

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Blobs lumineux derrière */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 top-10 h-96 w-96 rounded-full bg-brand-500/20 blur-[120px]" />
        <div className="absolute right-0 top-0 h-[28rem] w-[28rem] rounded-full bg-accent-600/25 blur-[130px]" />
        <div className="absolute left-1/3 top-72 h-80 w-80 rounded-full bg-fuchsia-600/15 blur-[120px]" />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-ink-950/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-600 shadow-glow">
              <span className="h-2.5 w-2.5 rounded-sm bg-white/90" />
            </span>
            <span className="pm-gradient-text text-lg font-extrabold tracking-tight">
              BluePrint
            </span>
          </div>
          <nav className="hidden items-center gap-1 md:flex">
            <a href="#features" className="pm-nav-link">Fonctionnalités</a>
            <a href="#securite" className="pm-nav-link">Sécurité</a>
          </nav>
          <Link to={primaryTo} className="pm-btn-primary py-2">
            {authed ? "Ouvrir l'app" : "Commencer →"}
          </Link>
        </div>
      </header>

      {/* Hero deux colonnes */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 lg:grid-cols-2 lg:pt-24">
        <div>
          <span className="pm-chip mb-6 border-accent/30 bg-accent/10 text-accent-500">
            ✦ Propulsé par l'IA
          </span>
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl">
            Vos projets,{" "}
            <span className="pm-gradient-text">pilotés par l'IA.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-slate-400">
            BluePrint détecte les signaux faibles en continu et déploie des
            agents autonomes qui diagnostiquent, planifient et rendent compte —
            avant que le retard n'arrive.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={primaryTo} className="pm-btn-primary px-6 py-3 text-base">
              {primaryLabel} →
            </Link>
            <a href="#features" className="pm-btn-ghost px-6 py-3 text-base">
              Découvrir les fonctionnalités
            </a>
          </div>
          <div className="mt-8 flex items-center gap-6 text-sm text-slate-500">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulseGlow rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]" />
              Sans carte bancaire
            </span>
            <span>Prêt en 2 minutes</span>
          </div>
        </div>

        {/* Aperçu produit (glass) */}
        <div className="pm-card relative p-5 shadow-glow-violet">
          <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-brand-500 to-accent-600">
                <span className="h-1.5 w-1.5 rounded-sm bg-white/90" />
              </span>
              <span className="text-sm font-semibold text-slate-200">
                BluePrint
              </span>
            </div>
            <div className="flex gap-1.5">
              <span className="h-2 w-2 rounded-full bg-white/20" />
              <span className="h-2 w-2 rounded-full bg-white/20" />
              <span className="h-2 w-2 rounded-full bg-white/20" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {previewCards.map((c) => (
              <div
                key={c.title}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${c.tint} text-base shadow-glow`}
                >
                  {c.icon}
                </div>
                <div className="mt-3 text-sm font-semibold text-white">
                  {c.title}
                </div>
                <div className="mt-0.5 text-xs text-slate-400">{c.desc}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="pm-gradient-text font-mono text-base font-bold">
                  {s.value}
                </div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-500">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fonctionnalités */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-16">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Tout ce qu'il faut,{" "}
            <span className="pm-gradient-text">au même endroit.</span>
          </h2>
          <p className="mt-3 text-slate-400">
            Des fonctionnalités puissantes, réunies dans une interface claire.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="pm-card group p-6 transition hover:border-white/20 hover:shadow-glow"
            >
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${f.tint} text-lg shadow-glow`}
              >
                {f.icon}
              </div>
              <h3 className="mt-4 font-semibold text-white">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Sécurité */}
      <section id="securite" className="mx-auto max-w-6xl px-5 pb-16">
        <div className="pm-card flex flex-col items-center gap-6 p-10 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold text-white">
              Vos données restent protégées.
            </h2>
            <p className="mt-2 text-slate-400">
              Authentification JWT, chiffrement au repos, journal d'audit, et
              conformité RGPD native (accès, portabilité, effacement).
            </p>
          </div>
          <Link
            to={primaryTo}
            className="pm-btn-primary shrink-0 px-6 py-3 text-base"
          >
            {primaryLabel} →
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-600">
        BluePrint — gestion de projet prédictive &amp; agentique
      </footer>
    </div>
  );
}
