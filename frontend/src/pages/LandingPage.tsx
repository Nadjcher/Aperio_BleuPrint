import { Link } from "react-router-dom";
import { tokenStore } from "../api/client";
import { Icon, type IconName } from "../components/Icon";

const authed = Boolean(tokenStore.access);
const primaryTo = authed ? "/dashboard" : "/login";
const primaryLabel = authed ? "Ouvrir l'app" : "Commencer gratuitement";

interface Card {
  icon: IconName;
  title: string;
  desc: string;
  tint: string;
}

/** Cartes « aperçu produit » dans le hero. */
const previewCards: Card[] = [
  { icon: "bolt", title: "Détecte", desc: "Signaux & anomalies, en continu", tint: "from-brand-500 to-brand-400" },
  { icon: "bot", title: "Agit", desc: "4 agents qui décident", tint: "from-accent-500 to-accent-600" },
  { icon: "report", title: "Synthétise", desc: "Rapports IA en 1 clic", tint: "from-fuchsia-500 to-accent-600" },
  { icon: "shield", title: "Protège", desc: "Chiffré · RGPD natif", tint: "from-emerald-500 to-brand-400" },
];

/** Section « Comment ça marche ». */
const steps: Card[] = [
  { icon: "branch", title: "Connectez votre dépôt", desc: "Reliez GitHub en un clic — aucune configuration lourde.", tint: "from-brand-500 to-brand-400" },
  { icon: "search", title: "BluePrint analyse", desc: "Les signaux sont collectés et les anomalies détectées en continu.", tint: "from-cyan-500 to-accent-500" },
  { icon: "rocket", title: "Les agents agissent", desc: "Diagnostic, plan d'action et rapport, prêts à valider.", tint: "from-accent-500 to-accent-600" },
];

/** Grille complète des fonctionnalités. */
const features: Card[] = [
  { icon: "bolt", title: "Signaux en temps réel", desc: "Commits, PRs et issues collectés en continu via vos connecteurs.", tint: "from-brand-500 to-brand-400" },
  { icon: "trending", title: "Détection d'anomalies", desc: "Un score statistique robuste repère les dérapages avant qu'ils ne coûtent.", tint: "from-cyan-500 to-brand-400" },
  { icon: "bot", title: "4 agents autonomes", desc: "Monitor, Analyst, Planner et Reporter surveillent, diagnostiquent et agissent.", tint: "from-accent-500 to-accent-600" },
  { icon: "report", title: "Synthèses par IA", desc: "Rapports hebdo et mensuels générés et prêts à partager.", tint: "from-fuchsia-500 to-accent-600" },
  { icon: "shield", title: "Sécurisé & RGPD", desc: "JWT, chiffrement au repos, export et effacement des données natifs.", tint: "from-emerald-500 to-brand-400" },
  { icon: "check", title: "Simple à utiliser", desc: "Reliez un dépôt, cliquez sur Synchroniser : le reste est automatique.", tint: "from-brand-400 to-accent-500" },
];

const stats = [
  { value: "4", label: "agents autonomes" },
  { value: "90%+", label: "de précision" },
  { value: "< 5s", label: "par décision" },
  { value: "€0–15", label: "par mois" },
];

function IconBox({ icon, tint, size = "md" }: { icon: IconName; tint: string; size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <div className={`flex ${box} items-center justify-center rounded-xl bg-gradient-to-br ${tint} text-white shadow-glow`}>
      <Icon name={icon} className={ic} />
    </div>
  );
}

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
            <a href="#how" className="pm-nav-link">Comment ça marche</a>
            <a href="#features" className="pm-nav-link">Fonctionnalités</a>
            <a href="#securite" className="pm-nav-link">Sécurité</a>
          </nav>
          <Link to={primaryTo} className="pm-btn-primary py-2">
            {authed ? "Ouvrir l'app" : "Commencer →"}
          </Link>
        </div>
      </header>

      {/* Hero deux colonnes */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-16 lg:grid-cols-2 lg:pt-24">
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
            <a href="#how" className="pm-btn-ghost px-6 py-3 text-base">
              Comment ça marche
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
              <span className="text-sm font-semibold text-slate-200">BluePrint</span>
            </div>
            <div className="flex gap-1.5">
              <span className="h-2 w-2 rounded-full bg-white/20" />
              <span className="h-2 w-2 rounded-full bg-white/20" />
              <span className="h-2 w-2 rounded-full bg-white/20" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {previewCards.map((c) => (
              <div key={c.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <IconBox icon={c.icon} tint={c.tint} size="sm" />
                <div className="mt-3 text-sm font-semibold text-white">{c.title}</div>
                <div className="mt-0.5 text-xs text-slate-400">{c.desc}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="pm-gradient-text font-mono text-base font-bold">{s.value}</div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-500">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-16">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Comment ça marche, <span className="pm-gradient-text">en 3 étapes.</span>
          </h2>
          <p className="mt-3 text-slate-400">
            De la connexion au rapport, sans friction.
          </p>
        </div>
        <div className="relative grid gap-4 md:grid-cols-3">
          {/* ligne de liaison (desktop) */}
          <div className="pointer-events-none absolute left-0 right-0 top-16 hidden h-px bg-gradient-to-r from-transparent via-white/15 to-transparent md:block" />
          {steps.map((s, i) => (
            <div key={s.title} className="pm-card relative p-6">
              <div className="flex items-center justify-between">
                <IconBox icon={s.icon} tint={s.tint} />
                <span className="font-mono text-4xl font-bold text-white/10">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-4 font-semibold text-white">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{s.desc}</p>
            </div>
          ))}
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
              <IconBox icon={f.icon} tint={f.tint} />
              <h3 className="mt-4 font-semibold text-white">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{f.desc}</p>
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
          <Link to={primaryTo} className="pm-btn-primary shrink-0 px-6 py-3 text-base">
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
