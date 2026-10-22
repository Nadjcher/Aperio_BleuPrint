import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { tokenStore } from "../api/client";
import { Icon, type IconName } from "../components/Icon";
import { demo } from "../store/authSlice";
import { useAppDispatch } from "../store";
import { SiteFooter } from "../components/SiteFooter";

const authed = Boolean(tokenStore.access);
const primaryTo = authed ? "/dashboard" : "/login";

/** Logo : carré signal + mot-marque en display. */
function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-signal">
        <span className="h-2.5 w-2.5 rounded-[2px] bg-white" />
      </span>
      <span className="font-display text-xl font-extrabold tracking-tight text-ink">Aperio</span>
    </span>
  );
}

// ── Héros : le briefing du matin, mis en scène comme preuve produit ──────────
type State = "rouge" | "orange" | "vert";
const DOT: Record<State, string> = {
  rouge: "bg-danger",
  orange: "bg-warning",
  vert: "bg-success",
};
const briefLines: { state: State; text: string }[] = [
  { state: "rouge", text: "Activité en chute sur « Refonte e-commerce »" },
  { state: "orange", text: "Sprint 3 surchargé — 2 jalons menacés" },
  { state: "rouge", text: "1 brique en retard en bloque 2 autres" },
  { state: "vert", text: "Compte rendu du comité prêt à valider" },
];

function BriefingArtifact() {
  return (
    <div className="relative">
      {/* Halo signal discret derrière la carte */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-signal/10 blur-2xl"
      />
      <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-[0_30px_80px_-40px_rgba(18,21,27,0.45)]">
        <div className="flex items-center justify-between border-b border-ink/10 bg-paper/60 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulseGlow rounded-full bg-signal" />
            <span className="text-sm font-semibold text-ink">Briefing du matin</span>
          </div>
          <span className="font-mono text-xs tabular-nums text-graphite">08:12</span>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm text-graphite">
            Pendant la nuit, Aperio a repéré{" "}
            <span className="font-semibold text-ink">3 points à traiter</span>.
          </p>

          <ul className="mt-3 space-y-2">
            {briefLines.map((l, i) => (
              <li
                key={l.text}
                className="flex items-start gap-3 rounded-xl border border-ink/10 bg-paper/50 px-3.5 py-2.5 motion-safe:animate-riseIn"
                style={{ animationDelay: `${0.15 + i * 0.12}s` }}
              >
                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-sm ${DOT[l.state]}`} />
                <span className="text-sm leading-snug text-ink/90">{l.text}</span>
              </li>
            ))}
          </ul>

          <div
            className="mt-4 flex items-end justify-between rounded-xl bg-ink px-4 py-3.5 motion-safe:animate-riseIn"
            style={{ animationDelay: "0.7s" }}
          >
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-white/60">
                Santé du portefeuille
              </div>
              <div className="font-mono text-2xl font-bold tabular-nums text-white">59</div>
            </div>
            {/* Mini-jauge */}
            <div className="flex items-end gap-1" aria-hidden="true">
              {[40, 62, 48, 35, 30, 59].map((h, i) => (
                <span
                  key={i}
                  className="w-2 rounded-sm bg-signal/70"
                  style={{ height: `${Math.max(10, h * 0.5)}px` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sections ─────────────────────────────────────────────────────────────────
const steps = [
  {
    title: "Connectez vos outils",
    body: "GitHub, GitLab, Jira, Confluence, Notion — ou importez vos documents (PDF, Word). Deux minutes, pas de configuration lourde.",
  },
  {
    title: "Aperio surveille en continu",
    body: "L'avancement est suivi 24/7. Les retards et les risques sont détectés tôt, pas une fois constatés.",
  },
  {
    title: "Vous gardez le contrôle",
    body: "Briefing du jour, date de livraison prévue et comptes rendus — prêts à valider, pas à rédiger.",
  },
];

const capabilities: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "trending",
    title: "Date de livraison prévue",
    body: "Une estimation d'échéance avec niveau de confiance, recalculée au fil du projet.",
  },
  {
    icon: "check",
    title: "Briefing quotidien",
    body: "Chaque matin, l'essentiel à traiter, priorisé, avec l'action directe.",
  },
  {
    icon: "report",
    title: "Comptes rendus & rapports",
    body: "Synthèses de réunion et suivis d'avancement prêts à partager, en un geste.",
  },
  {
    icon: "branch",
    title: "Votre méthodologie",
    body: "Kanban, Scrum, PRINCE2 ou SAFe : le vocabulaire s'adapte à votre cadre.",
  },
  {
    icon: "shield",
    title: "Sécurisé & RGPD",
    body: "Chiffrement au repos, journal d'audit, export et effacement des données natifs.",
  },
];

export function LandingPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [demoLoading, setDemoLoading] = useState(false);

  const onDemo = async () => {
    setDemoLoading(true);
    const res = await dispatch(demo());
    setDemoLoading(false);
    if (demo.fulfilled.match(res)) navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-paper text-graphite">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-ink/10 bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Wordmark />
          <nav className="hidden items-center gap-7 md:flex">
            <a href="#how" className="text-sm font-medium text-graphite transition hover:text-ink">Fonctionnement</a>
            <a href="#capacites" className="text-sm font-medium text-graphite transition hover:text-ink">Capacités</a>
            <a href="#securite" className="text-sm font-medium text-graphite transition hover:text-ink">Sécurité</a>
          </nav>
          <Link
            to={primaryTo}
            className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-soft"
          >
            {authed ? "Ouvrir l'app" : "Commencer"}
          </Link>
        </div>
      </header>

      {/* Héros */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pt-24">
        <div>
          <p className="mb-5 text-sm font-semibold text-signal">Pilotage de projet prédictif</p>
          <h1 className="font-display text-[2.7rem] font-extrabold leading-[0.98] tracking-[-0.02em] text-ink sm:text-6xl">
            Ce qui va déraper, vous le voyez venir.
          </h1>
          <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-graphite">
            Aperio surveille vos projets en continu, repère les retards et les risques
            avant l'échéance, et prépare vos comptes rendus. Vous ouvrez le tableau de
            bord : l'essentiel est déjà trié.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            {!authed ? (
              <>
                <button
                  onClick={onDemo}
                  disabled={demoLoading}
                  className="rounded-xl bg-signal px-6 py-3.5 text-base font-semibold text-white shadow-[0_12px_30px_-12px_rgba(109,74,255,0.8)] transition hover:bg-signal-deep disabled:opacity-60"
                >
                  {demoLoading ? "Préparation…" : "Voir une démo complète"}
                </button>
                <Link
                  to={primaryTo}
                  className="text-base font-semibold text-ink underline decoration-ink/25 underline-offset-[6px] transition hover:decoration-ink"
                >
                  Commencer gratuitement
                </Link>
              </>
            ) : (
              <Link
                to={primaryTo}
                className="rounded-xl bg-signal px-6 py-3.5 text-base font-semibold text-white transition hover:bg-signal-deep"
              >
                Ouvrir l'application
              </Link>
            )}
          </div>

          {!authed && (
            <p className="mt-5 text-sm text-graphite/80">
              Démo instantanée · compte pré-rempli · sans e-mail ni carte bancaire
            </p>
          )}
        </div>

        <BriefingArtifact />
      </section>

      {/* Différenciateur — réponse à « un assistant IA fait déjà ça » */}
      <section className="border-y border-ink/10 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <p className="max-w-4xl font-display text-2xl font-semibold leading-snug tracking-[-0.01em] text-ink sm:text-[2rem]">
            Un assistant répond quand vous le sollicitez.{" "}
            <span className="text-graphite">
              Aperio travaille sans qu'on lui demande : il surveille jour et nuit, garde
              l'historique de chaque projet et vous alerte de lui-même.
            </span>
          </p>
        </div>
      </section>

      {/* Fonctionnement — vraie séquence, donc numérotée */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="max-w-2xl font-display text-3xl font-bold tracking-[-0.01em] text-ink sm:text-4xl">
          De vos outils au pilotage, en trois temps.
        </h2>
        <div className="mt-12 grid gap-10 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title}>
              <div className="font-display text-5xl font-extrabold text-signal/90">
                {i + 1}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-ink">{s.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-graphite">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Capacités — hiérarchisées : une capacité phare, puis les autres */}
      <section id="capacites" className="border-t border-ink/10 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="max-w-2xl font-display text-3xl font-bold tracking-[-0.01em] text-ink sm:text-4xl">
            Tout pour piloter, au même endroit.
          </h2>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {/* Carte phare */}
            <article className="flex flex-col justify-between rounded-2xl bg-ink p-7 text-white lg:row-span-2">
              <div>
                <Icon name="bolt" className="h-7 w-7 text-signal" />
                <h3 className="mt-5 font-display text-2xl font-bold leading-tight">
                  Alerté avant le retard.
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-white/70">
                  Les jalons qui vont déraper sont signalés tôt — au rythme réel de
                  l'équipe, pas une fois l'échéance ratée. C'est le cœur d'Aperio :
                  vous prévenir pendant qu'il est encore temps d'agir.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-3 border-t border-white/10 pt-5">
                <span className="h-2.5 w-2.5 rounded-sm bg-danger" />
                <span className="text-sm text-white/80">
                  « Sprint 3 : 33 pts restants pour 14 pts / semaine. »
                </span>
              </div>
            </article>

            {/* Capacités de soutien */}
            {capabilities.map((c) => (
              <article
                key={c.title}
                className="rounded-2xl border border-ink/10 bg-paper/40 p-6 transition hover:border-signal/40"
              >
                <Icon name={c.icon} className="h-6 w-6 text-ink" />
                <h3 className="mt-4 font-semibold text-ink">{c.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-graphite">{c.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Sécurité */}
      <section id="securite" className="mx-auto max-w-6xl px-5 py-20">
        <div className="flex flex-col items-start gap-8 rounded-2xl border border-ink/10 bg-white p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl font-bold text-ink">
              Vos données restent protégées.
            </h2>
            <p className="mt-3 leading-relaxed text-graphite">
              Authentification JWT, chiffrement au repos, journal d'audit et conformité
              RGPD native : accès, portabilité et effacement de vos données.
            </p>
          </div>
          <Link
            to={primaryTo}
            className="shrink-0 rounded-xl bg-signal px-6 py-3.5 text-base font-semibold text-white transition hover:bg-signal-deep"
          >
            {authed ? "Ouvrir l'app" : "Commencer gratuitement"}
          </Link>
        </div>
      </section>

      {/* CTA final */}
      <section className="border-t border-ink/10 bg-ink">
        <div className="mx-auto max-w-6xl px-5 py-20 text-center">
          <h2 className="mx-auto max-w-3xl font-display text-4xl font-extrabold leading-[1.02] tracking-[-0.02em] text-white sm:text-5xl">
            Arrivez en réunion avec une longueur d'avance.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-white/70">
            Essayez la démo complète en dix secondes — rien à installer, rien à saisir.
          </p>
          {!authed && (
            <button
              onClick={onDemo}
              disabled={demoLoading}
              className="mt-8 rounded-xl bg-signal px-7 py-4 text-base font-semibold text-white shadow-[0_16px_40px_-16px_rgba(109,74,255,0.9)] transition hover:bg-signal-deep disabled:opacity-60"
            >
              {demoLoading ? "Préparation…" : "Voir une démo complète"}
            </button>
          )}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
