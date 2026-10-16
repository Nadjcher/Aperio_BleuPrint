import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { tokenStore } from "../api/client";
import { Icon, type IconName } from "../components/Icon";
import { demo } from "../store/authSlice";
import { useAppDispatch } from "../store";
import { SiteFooter } from "../components/SiteFooter";

const authed = Boolean(tokenStore.access);
const primaryTo = authed ? "/dashboard" : "/login";
const primaryLabel = authed ? "Ouvrir l'app" : "Commencer gratuitement";

const BLUE = "from-brand-500 to-accent-600";

interface Card {
  icon: IconName;
  title: string;
  desc: string;
}

// Lignes du « briefing du matin » : ce qu'Aperio a détecté seul, sans qu'on
// lui demande. Rend la surveillance proactive concrète dès le hero.
interface BriefLine {
  state: "rouge" | "orange" | "vert";
  text: string;
}

const briefLines: BriefLine[] = [
  { state: "rouge", text: "1 risque critique : chute d'activité détectée sur « Refonte e-commerce »" },
  { state: "orange", text: "2 jalons vont glisser — Sprint 3 surchargé (33 pts restants)" },
  { state: "rouge", text: "1 brique en retard en bloque 2 autres dans le portefeuille" },
  { state: "vert", text: "Compte rendu du comité de pilotage prêt à valider" },
];

const STATE_DOT: Record<BriefLine["state"], string> = {
  rouge: "bg-rose-500",
  orange: "bg-amber-500",
  vert: "bg-emerald-500",
};

const steps: Card[] = [
  { icon: "branch", title: "Connectez vos outils", desc: "GitHub, GitLab, Jira, Confluence, Notion — ou importez vos documents (PDF, Word)." },
  { icon: "search", title: "Aperio surveille", desc: "L'avancement est suivi en continu ; retards et risques sont détectés tôt." },
  { icon: "rocket", title: "Vous gardez le contrôle", desc: "Briefing du jour, date de livraison prévue et comptes rendus, prêts à valider." },
];

const features: Card[] = [
  { icon: "trending", title: "Date de livraison prévue", desc: "Une estimation d'échéance avec niveau de confiance, mise à jour au fil du projet." },
  { icon: "bolt", title: "Alerte avant le retard", desc: "Les jalons qui vont déraper sont signalés tôt — pas une fois le retard constaté." },
  { icon: "check", title: "Briefing quotidien", desc: "Chaque matin, l'essentiel à traiter, priorisé, avec l'action directe." },
  { icon: "report", title: "Comptes rendus & rapports", desc: "Suivi d'avancement et synthèses prêts à partager, en un clic." },
  { icon: "bot", title: "Votre méthodologie", desc: "Kanban, Scrum, PRINCE2 ou SAFe : le vocabulaire s'adapte à votre cadre." },
  { icon: "shield", title: "Sécurisé & RGPD", desc: "Chiffrement au repos, journal d'audit, export et effacement des données natifs." },
];

const stats = [
  { value: "6", label: "sources" },
  { value: "24/7", label: "surveillance" },
  { value: "1 clic", label: "rapport" },
  { value: "€0–15", label: "/ mois" },
];

function IconBox({ icon, size = "md" }: { icon: IconName; size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const ic = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <div className={`flex ${box} items-center justify-center rounded-lg bg-gradient-to-br ${BLUE} text-heading shadow-glow`}>
      <Icon name={icon} className={ic} />
    </div>
  );
}

function SectionHead({ num, eyebrow, title, grad, sub }: { num: string; eyebrow: string; title: string; grad: string; sub: string }) {
  return (
    <div className="mb-12 text-center">
      <span className="pm-eyebrow justify-center">{num} — {eyebrow}</span>
      <h2 className="mt-4 text-3xl font-bold tracking-tight text-heading sm:text-4xl">
        {title} <span className="pm-gradient-text">{grad}</span>
      </h2>
      <p className="mt-3 text-muted">{sub}</p>
    </div>
  );
}

export function LandingPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [demoLoading, setDemoLoading] = useState(false);

  // Démo : compte pré-rempli → on voit la valeur tout de suite sur le dashboard.
  const onDemo = async () => {
    setDemoLoading(true);
    const res = await dispatch(demo());
    setDemoLoading(false);
    if (demo.fulfilled.match(res)) navigate("/dashboard");
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Halos bleus discrets */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-accent-600/15 blur-[130px]" />
        <div className="absolute right-0 top-10 h-[26rem] w-[26rem] rounded-full bg-brand-500/15 blur-[130px]" />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-blue-400/10 bg-app/80 backdrop-blur-xl">
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
          <span className="pm-eyebrow mb-6">Pour les chefs de projet</span>
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-heading sm:text-6xl">
            Chaque matin, Aperio vous dit{" "}
            <span className="pm-gradient-text">ce qui va déraper — avant que ça arrive.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted">
            Aperio surveille vos projets en continu, repère les retards et les
            risques avant l'échéance, et prépare vos comptes rendus. Vous
            ouvrez votre tableau de bord : l'essentiel à traiter est déjà là.
          </p>

          {/* Réponse directe à l'objection « un assistant IA fait déjà ça ». */}
          <div className="mt-6 max-w-xl rounded-lg border border-blue-400/15 bg-surface/60 p-4">
            <p className="text-sm text-fg">
              <span className="font-semibold text-heading">Un assistant répond quand vous le sollicitez.</span>{" "}
              Aperio travaille sans qu'on lui demande : il surveille 24/7, garde
              l'historique de chaque projet et vous alerte de lui-même.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {!authed ? (
              <>
                <button
                  onClick={onDemo}
                  disabled={demoLoading}
                  className="pm-btn-primary px-6 py-3 text-base"
                >
                  {demoLoading ? "Préparation de la démo…" : "▶ Voir une démo complète"}
                </button>
                <Link to={primaryTo} className="pm-btn-ghost px-6 py-3 text-base">
                  Commencer gratuitement →
                </Link>
              </>
            ) : (
              <Link to={primaryTo} className="pm-btn-primary px-6 py-3 text-base">
                {primaryLabel} →
              </Link>
            )}
          </div>
          {!authed && (
            <p className="mt-3 font-mono text-xs text-muted">
              Démo instantanée · compte pré-rempli · sans e-mail ni carte bancaire
            </p>
          )}
          <div className="mt-8 flex items-center gap-6 font-mono text-xs uppercase tracking-wider text-muted">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulseGlow rounded-full bg-brand-400 shadow-[0_0_8px_2px_rgba(56,189,248,0.6)]" />
              Surveillance 24/7
            </span>
            <span>Prêt en 2 min</span>
          </div>
        </div>

        {/* Aperçu produit — le « briefing du matin » tel qu'Aperio le présente,
            pour montrer concrètement la détection proactive. */}
        <div className="pm-card relative p-5">
          <div className="mb-4 flex items-center justify-between border-b border-blue-400/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-[5px] bg-gradient-to-br from-brand-500 to-accent-600">
                <span className="h-1.5 w-1.5 rounded-[2px] bg-white/90" />
              </span>
              <span className="text-sm font-semibold text-fg">Briefing du matin</span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
              live
            </span>
          </div>

          <p className="mb-3 text-sm text-fg">
            Pendant votre absence, Aperio a détecté{" "}
            <span className="font-semibold text-heading">3 points à traiter</span>.
          </p>

          <ul className="space-y-2">
            {briefLines.map((l) => (
              <li
                key={l.text}
                className="flex items-start gap-2.5 rounded-lg border border-blue-400/10 bg-surface p-3"
              >
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STATE_DOT[l.state]}`} />
                <span className="text-xs leading-relaxed text-fg">{l.text}</span>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex items-center justify-between rounded-lg border border-blue-400/10 bg-white/[0.015] p-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wide text-muted">Santé du portefeuille</div>
              <div className="pm-gradient-text font-mono text-xl font-bold">59 / 100</div>
            </div>
            <div className="flex gap-4 text-center">
              {stats.slice(0, 3).map((s) => (
                <div key={s.label}>
                  <div className="font-mono text-sm font-bold text-heading">{s.value}</div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Fonctionnement */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-16">
        <SectionHead
          num="01"
          eyebrow="Fonctionnement"
          title="De vos outils au pilotage,"
          grad="en 3 étapes."
          sub="Sans friction, sans configuration lourde."
        />
        <div className="relative grid gap-4 md:grid-cols-3">
          <div className="pointer-events-none absolute left-0 right-0 top-16 hidden h-px bg-gradient-to-r from-transparent via-blue-400/20 to-transparent md:block" />
          {steps.map((s, i) => (
            <div key={s.title} className="pm-card relative p-6">
              <div className="flex items-center justify-between">
                <IconBox icon={s.icon} />
                <span
                  aria-hidden="true"
                  className="font-mono text-4xl font-bold text-[#828997]"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-4 font-semibold text-heading">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Capacités */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-16">
        <SectionHead
          num="02"
          eyebrow="Capacités"
          title="Tout pour piloter vos projets,"
          grad="au même endroit."
          sub="L'essentiel du pilotage, réuni dans une interface claire."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="pm-card group p-6 transition hover:border-blue-400/35 hover:shadow-glow"
            >
              <IconBox icon={f.icon} />
              <h3 className="mt-4 font-semibold text-heading">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sécurité */}
      <section id="securite" className="mx-auto max-w-6xl px-5 pb-20">
        <div className="pm-card relative flex flex-col items-center gap-6 p-10 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="max-w-xl">
            <span className="pm-eyebrow mb-3">03 — Sécurité &amp; conformité</span>
            <h2 className="mt-3 text-2xl font-bold text-heading">
              Vos données restent protégées.
            </h2>
            <p className="mt-2 text-muted">
              Authentification JWT, chiffrement au repos, journal d'audit, et
              conformité RGPD native (accès, portabilité, effacement).
            </p>
          </div>
          <Link to={primaryTo} className="pm-btn-primary shrink-0 px-6 py-3 text-base">
            {primaryLabel} →
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
