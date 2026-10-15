import { Link, NavLink } from "react-router-dom";

/**
 * Pages légales (France · RGPD · LCEN). Les valeurs entre [crochets] sont à
 * compléter par l'éditeur avant la mise en ligne publique (voir docs/COMPLIANCE.md).
 */

// ─── À COMPLÉTER PAR L'ÉDITEUR ───────────────────────────────────────────────
const EDITOR = {
  name: "[Prénom NOM]",
  status: "Personne physique (particulier)",
  address: "[Adresse postale]",
  email: "[adresse-de-contact@exemple.fr]",
};
const UPDATED = "14 octobre 2026";
// Hébergeurs (à jour au moment de la rédaction)
const HOSTS = {
  frontend: "Vercel Inc. — 340 S Lemon Ave #4133, Walnut, CA 91789, USA — vercel.com",
  api: "Render (Render Services, Inc.) — 525 Brannan St, Ste 300, San Francisco, CA 94107, USA — render.com",
  db: "Neon, Inc. (base de données PostgreSQL managée) — USA — neon.tech",
};

const legalLinks = [
  { to: "/legal/mentions", label: "Mentions légales" },
  { to: "/legal/confidentialite", label: "Confidentialité" },
  { to: "/legal/cgu", label: "CGU" },
  { to: "/legal/cookies", label: "Cookies" },
];

function LegalLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-app/80 backdrop-blur-xl">
        <nav
          className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-5 py-4"
          aria-label="Navigation légale"
        >
          <Link to="/" className="pm-gradient-text text-lg font-extrabold tracking-tight">
            Aperio
          </Link>
          <div className="flex flex-wrap gap-1 text-sm">
            {legalLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) => `pm-nav-link ${isActive ? "pm-nav-link-active" : ""}`}
              >
                {l.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="text-2xl font-bold tracking-tight text-heading">{title}</h1>
        <p className="mt-1 text-sm text-muted">Dernière mise à jour : {UPDATED}</p>
        <div className="legal-prose mt-8 space-y-6 text-sm leading-relaxed text-fg">
          {children}
        </div>
        <p className="mt-12 text-sm">
          <Link to="/" className="pm-link">
            ← Retour à l'accueil
          </Link>
        </p>
      </main>
    </div>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="pt-2 text-lg font-semibold text-heading">{children}</h2>;
}

export function MentionsLegalesPage() {
  return (
    <LegalLayout title="Mentions légales">
      <p>
        Conformément à l'article 6-III de la loi n° 2004-575 du 21 juin 2004 pour
        la confiance dans l'économie numérique (LCEN), il est précisé aux
        utilisateurs du site Aperio l'identité des différents intervenants dans
        le cadre de sa réalisation et de son suivi.
      </p>

      <H2>Éditeur</H2>
      <p>
        {EDITOR.name} — {EDITOR.status}.<br />
        Adresse : {EDITOR.address}.<br />
        Contact : {EDITOR.email}.<br />
        Directeur de la publication : {EDITOR.name}.
      </p>

      <H2>Hébergement</H2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Site (frontend) : {HOSTS.frontend}</li>
        <li>Application (API) : {HOSTS.api}</li>
        <li>Base de données : {HOSTS.db}</li>
      </ul>

      <H2>Propriété intellectuelle</H2>
      <p>
        L'ensemble des éléments du site (structure, code, textes, éléments
        graphiques) est protégé. Toute reproduction non autorisée est interdite,
        sauf mention contraire (par exemple le code source publié sous licence
        libre, le cas échéant).
      </p>

      <H2>Contact</H2>
      <p>
        Pour toute question relative au site, écrivez à {EDITOR.email}.
      </p>
    </LegalLayout>
  );
}

export function ConfidentialitePage() {
  return (
    <LegalLayout title="Politique de confidentialité">
      <p>
        Cette politique décrit comment Aperio traite vos données personnelles,
        conformément au Règlement (UE) 2016/679 (RGPD) et à la loi
        « Informatique et Libertés ».
      </p>

      <H2>1. Responsable de traitement</H2>
      <p>
        {EDITOR.name}, joignable à {EDITOR.email}.
      </p>

      <H2>2. Données collectées</H2>
      <ul className="list-disc space-y-1 pl-5">
        <li><b>Compte</b> : adresse e-mail, nom, mot de passe (stocké haché, jamais en clair), rôle.</li>
        <li><b>Utilisation</b> : projets créés, dépôts GitHub <i>publics</i> que vous choisissez de suivre, signaux agrégés, anomalies, décisions et retours que vous donnez.</li>
        <li><b>Techniques / sécurité</b> : journal d'audit des actions clés avec adresse IP <b>tronquée</b> (anonymisée) et horodatage ; jetons d'authentification (stockés hachés).</li>
      </ul>
      <p>
        Aucune donnée sensible n'est collectée. Aucun profilage publicitaire,
        aucune revente de données.
      </p>

      <H2>3. Finalités et bases légales</H2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Fournir le service (gestion de compte, projets, synthèses) — <i>exécution du contrat</i> (CGU).</li>
        <li>Sécurité, prévention des abus, journal d'audit — <i>intérêt légitime</i>.</li>
        <li>E-mails transactionnels (vérification, réinitialisation) — <i>exécution du contrat</i> ; notifications (anomalies, résumé) — <i>consentement</i>, désactivable à tout moment.</li>
        <li>Respect d'obligations légales le cas échéant.</li>
      </ul>

      <H2>4. Destinataires et sous-traitants</H2>
      <p>Vos données sont traitées par des prestataires techniques agissant pour notre compte :</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>Neon (base de données) — États-Unis</li>
        <li>Render (hébergement de l'API) — États-Unis</li>
        <li>Vercel (hébergement du site) — États-Unis</li>
        <li>GitHub (lecture de dépôts publics que vous indiquez)</li>
        <li>Resend (envoi d'e-mails) — <i>si activé</i> — États-Unis</li>
        <li>Fournisseur LLM (Groq / Anthropic) — <i>si activé</i>, pour l'enrichissement des synthèses — États-Unis</li>
      </ul>

      <H2>5. Transferts hors Union européenne</H2>
      <p>
        Certains sous-traitants ci-dessus sont situés aux États-Unis. Ces
        transferts sont encadrés par des garanties appropriées (Clauses
        Contractuelles Types de la Commission européenne et/ou adhésion au
        <i> EU-US Data Privacy Framework</i>). Vous pouvez demander une copie des
        garanties applicables à {EDITOR.email}.
      </p>

      <H2>6. Durées de conservation</H2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Données de compte : tant que le compte est actif ; supprimées sur demande d'effacement.</li>
        <li>Journaux d'audit : 12 mois (puis purge automatique).</li>
        <li>Jetons de session (refresh) : 7 jours ; jetons à usage unique : 1 h à 24 h.</li>
      </ul>

      <H2>7. Vos droits</H2>
      <p>Vous disposez des droits d'accès, de rectification, d'effacement, de portabilité, d'opposition et de limitation :</p>
      <ul className="list-disc space-y-1 pl-5">
        <li><b>Accès / portabilité</b> : export JSON de vos données depuis votre compte.</li>
        <li><b>Rectification</b> : modification de votre profil.</li>
        <li><b>Effacement</b> : suppression de votre compte et de vos données.</li>
        <li>Autres demandes : écrivez à {EDITOR.email}.</li>
      </ul>
      <p>
        Vous pouvez introduire une réclamation auprès de la CNIL (
        <a href="https://www.cnil.fr" className="pm-link" target="_blank" rel="noreferrer">
          cnil.fr
        </a>
        ).
      </p>

      <H2>8. Sécurité</H2>
      <p>
        Chiffrement en transit (HTTPS/HSTS), mots de passe hachés (bcrypt),
        chiffrement au repos des champs sensibles (AES-256-GCM), minimisation des
        données et contrôle d'accès par rôles.
      </p>

      <H2>9. Mineurs</H2>
      <p>
        Le service n'est pas destiné aux personnes de moins de 15 ans sans
        autorisation du titulaire de l'autorité parentale.
      </p>
    </LegalLayout>
  );
}

export function CGUPage() {
  return (
    <LegalLayout title="Conditions générales d'utilisation">
      <H2>1. Objet</H2>
      <p>
        Les présentes CGU régissent l'accès et l'utilisation du service Aperio,
        outil de suivi prédictif de projets. En créant un compte ou en utilisant
        le mode invité, vous acceptez ces conditions.
      </p>

      <H2>2. Accès au service</H2>
      <p>
        Le service est fourni à titre gratuit, « en l'état », sans garantie de
        disponibilité ni d'absence d'erreur. Un mode d'essai sans inscription
        (invité) est proposé, limité ; la création d'un compte permet de
        conserver vos données.
      </p>

      <H2>3. Compte et sécurité</H2>
      <p>
        Vous vous engagez à fournir des informations exactes et à préserver la
        confidentialité de vos identifiants. Vous êtes responsable des activités
        réalisées depuis votre compte.
      </p>

      <H2>4. Usage acceptable</H2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Ne pas détourner le service à des fins illicites.</li>
        <li>Ne pas tenter de contourner les limites techniques ou de sécurité.</li>
        <li>Respecter les droits des dépôts et contenus tiers que vous analysez.</li>
      </ul>

      <H2>5. Propriété intellectuelle</H2>
      <p>
        Vous conservez vos contenus. Le service et ses composants restent la
        propriété de l'éditeur (sauf parties publiées sous licence libre).
      </p>

      <H2>6. Responsabilité</H2>
      <p>
        Le service étant fourni gratuitement et sans garantie, la responsabilité
        de l'éditeur ne saurait être engagée pour les dommages indirects ou la
        perte de données, dans les limites permises par le droit français (la
        responsabilité en cas de faute lourde ou dolosive ne pouvant être
        exclue). Faites vos propres sauvegardes des données importantes.
      </p>

      <H2>7. Résiliation</H2>
      <p>
        Vous pouvez supprimer votre compte à tout moment. L'éditeur peut
        suspendre un compte en cas de manquement aux présentes CGU.
      </p>

      <H2>8. Droit applicable</H2>
      <p>
        Les présentes CGU sont soumises au droit français. À défaut de résolution
        amiable, les tribunaux français sont compétents.
      </p>

      <H2>9. Modifications</H2>
      <p>
        Les CGU peuvent évoluer ; la version en vigueur est celle publiée sur
        cette page.
      </p>
    </LegalLayout>
  );
}

export function CookiesPage() {
  return (
    <LegalLayout title="Politique relative aux cookies">
      <p>
        Aperio <b>n'utilise aucun cookie de traçage, de publicité ou de mesure
        d'audience</b> (pas de Google Analytics, pas de pixel tiers).
      </p>

      <H2>Stockage strictement nécessaire</H2>
      <p>
        Pour fonctionner, le site conserve dans le <i>stockage local</i> de votre
        navigateur (localStorage) les éléments suivants :
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li><code>pm.accessToken</code> / <code>pm.refreshToken</code> : vos jetons de connexion, pour vous maintenir authentifié.</li>
      </ul>
      <p>
        Ce stockage est <b>strictement nécessaire</b> à la fourniture du service
        que vous demandez (rester connecté). À ce titre, et conformément aux
        lignes directrices de la CNIL, il est <b>exempté de consentement
        préalable</b> : aucune bannière cookies n'est donc requise.
      </p>

      <H2>Gestion</H2>
      <p>
        Vous pouvez effacer ce stockage à tout moment en vous déconnectant ou via
        les réglages de votre navigateur. Sa suppression vous déconnectera
        simplement.
      </p>

      <H2>Évolution</H2>
      <p>
        Si, à l'avenir, des outils de mesure d'audience ou de tiers étaient
        ajoutés, un mécanisme de consentement conforme serait mis en place au
        préalable.
      </p>
    </LegalLayout>
  );
}
