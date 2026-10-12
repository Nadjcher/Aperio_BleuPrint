import { Link } from "react-router-dom";
import { tokenStore } from "../api/client";
import { Icon, type IconName } from "../components/Icon";

const authed = Boolean(tokenStore.access);
const primaryTo = authed ? "/dashboard" : "/login";
const primaryLabel = authed ? "Ouvrir l'app" : "Commencer gratuitement";

const BLUE = "from-brand-500 to-accent-600";

interface Card {
  icon: IconName;
  title: string;
  desc: string;
}

const previewCards: Card[] = [
  { icon: "bolt", title: "Détecte", desc: "Signaux & anomalies, en continu" },
  { icon: "bot", title: "Agit", desc: "4 agents qui décident" },
  { icon: "report", title: "Synthétise", desc: "Rapports IA en 1 clic" },
  { icon: "shield", title: "Protège", desc: "Chiffré · RGPD natif" },
];

const steps: Card[] = [
  { icon: "branch", title: "Connectez votre dépôt", desc: "Reliez GitHub en un clic — aucune configuration lourde." },
  { icon: "search", title: "Aperio analyse", desc: "Les signaux sont collectés et les anomalies détectées en continu." },
  { icon: "rocket", title: "Les agents agissent", desc: "Diagnostic, plan d'action et rapport, prêts à valider." },
];

const features: Card[] = [
  { icon: "bolt", title: "Signaux en temps réel", desc: "Commits, PRs et issues collectés en continu via vos connecteurs." },
  { icon: "trending", title: "Détection d'anomalies", desc: "Un score statistique robuste repère les dérapages avant qu'ils ne coûtent." },
  { icon: "bot", title: "4 agents autonomes", desc: "Monitor, Analyst, Planner et Reporter surveillent, diagnostiquent et agissent." },
  { icon: "report", title: "Synthèses par IA", desc: "Rapports hebdo et mensuels générés et prêts à partager." },
  { icon: "shield", title: "Sécurisé & RGPD", desc: "JWT, chiffrement au repos, export et effacement des données natifs." },
  { icon: "check", title: "Simple à utiliser", desc: "Reliez un dépôt, cliquez sur Synchroniser : le reste est automatique." },
];

const stats = [
  { value: "4", label: "agents" },
  { value: "90%+", label: "précision" },
  { value: "< 5s", label: "décision" },
  { value: "€0–15", label: "/ mois" },
];

function IconBox({ icon, size = "md" }: { icon: IconName; size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <div className={`flex ${box} items-center justify-center rounded-lg bg-gradient-to-br ${BLUE} text-white shadow-glow`}>
      <Icon name={icon} className={ic} />
    </div>
  );
}

function SectionHead({ num, eyebrow, title, grad, sub }: { num: string; eyebrow: string; title: string; grad: string; sub: string }) {
  return (
    <div className="mb-12 text-center">
      <span className="pm-eyebrow justify-center">{num} — {eyebrow}</span>
      <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
        {title} <span className="pm-gradient-text">{grad}</span>
      </h2>
      <p className="mt-3 text-slate-400">{sub}</p>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Halos bleus discrets */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-accent-600/15 blur-[130px]" />
        <div className="absolute right-0 top-10 h-[26rem] w-[26rem] rounded-full bg-brand-500/15 blur-[130px]" />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-blue-400/10 bg-ink-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-brand-500 to-accent-600 shadow-glow">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-white/90" />
            </span>
            <span className="pm-gradient-text text-lg font-extrabold tracking-tight">Aperio</span>
          </div>
          <nav className="hidden items-center gap-1 md:flex">
            <a href="#how" className="pm-nav-link">Fonctionnement</a>
            <a href="#features" className="pm-nav-link">Capacités</a>
            <a href="#securite" className="pm-nav-link">Sécurité</a>
          </nav>
          <Link to={primaryTo} className="pm-btn-primary py-2">
            {authed ? "Ouvrir l'app" : "Commencer →"}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-16 lg:grid-cols-2 lg:pt-24">
        <div>
          <span className="pm-eyebrow mb-6">Plateforme IA autonome</span>
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
            Vos projets,{" "}
            <span className="pm-gradient-text">pilotés par l'IA.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-slate-400">
            Aperio détecte les signaux faibles en continu et déploie des
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
          <div className="mt-8 flex items-center gap-6 font-mono text-xs uppercase tracking-wider text-slate-500">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulseGlow rounded-full bg-brand-400 shadow-[0_0_8px_2px_rgba(56,189,248,0.6)]" />
              Sans carte bancaire
            </span>
            <span>Prêt en 2 min</span>
          </div>
        </div>

        {/* Aperçu produit — cadre blueprint avec repères d'angle */}
        <div className="pm-card pm-ticks relative p-5">
          <div className="mb-4 flex items-center justify-between border-b border-blue-400/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-[5px] bg-gradient-to-br from-brand-500 to-accent-600">
                <span className="h-1.5 w-1.5 rounded-[2px] bg-white/90" />
              </span>
              <span className="text-sm font-semibold text-slate-200">Aperio</span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
              live
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {previewCards.map((c) => (
              <div key={c.title} className="rounded-lg border border-blue-400/10 bg-white/[0.02] p-4">
                <IconBox icon={c.icon} size="sm" />
                <div className="mt-3 text-sm font-semibold text-white">{c.title}</div>
                <div className="mt-0.5 text-xs text-slate-400">{c.desc}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 rounded-lg border border-blue-400/10 bg-white/[0.015] p-3 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="pm-gradient-text font-mono text-base font-bold">{s.value}</div>
                <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-slate-500">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fonctionnement */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-16">
        <SectionHead
          num="01"
          eyebrow="Fonctionnement"
          title="Du dépôt au rapport,"
          grad="en 3 étapes."
          sub="Sans friction, sans configuration lourde."
        />
        <div className="relative grid gap-4 md:grid-cols-3">
          <div className="pointer-events-none absolute left-0 right-0 top-16 hidden h-px bg-gradient-to-r from-transparent via-blue-400/20 to-transparent md:block" />
          {steps.map((s, i) => (
            <div key={s.title} className="pm-card relative p-6">
              <div className="flex items-center justify-between">
                <IconBox icon={s.icon} />
                <span className="font-mono text-4xl font-bold text-white/[0.07]">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-4 font-semibold text-white">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Capacités */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-16">
        <SectionHead
          num="02"
          eyebrow="Capacités"
          title="Tout ce qu'il faut,"
          grad="au même endroit."
          sub="Des fonctionnalités puissantes, réunies dans une interface claire."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="pm-card group p-6 transition hover:border-blue-400/35 hover:shadow-glow"
            >
              <IconBox icon={f.icon} />
              <h3 className="mt-4 font-semibold text-white">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sécurité */}
      <section id="securite" className="mx-auto max-w-6xl px-5 pb-20">
        <div className="pm-card pm-ticks relative flex flex-col items-center gap-6 p-10 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="max-w-xl">
            <span className="pm-eyebrow mb-3">03 — Sécurité &amp; conformité</span>
            <h2 className="mt-3 text-2xl font-bold text-white">
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

      <footer className="border-t border-blue-400/10 py-8 text-center font-mono text-xs uppercase tracking-widest text-slate-600">
        Aperio · gestion de projet prédictive &amp; agentique
      </footer>
    </div>
  );
}
