import type { Briefing, BriefingPriority } from "@projectmaster/shared";
import type { EmailMessage } from "./index.js";

const BRAND = "#2563eb";

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#0b1120;font-family:Inter,Arial,sans-serif;color:#e2e8f0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:480px;background:#111827;border:1px solid #1f2937;border-radius:16px;padding:32px">
        <tr><td style="font-weight:700;font-size:18px;color:#fff;padding-bottom:8px">Aperio</td></tr>
        <tr><td style="font-size:20px;font-weight:600;color:#fff;padding-bottom:16px">${title}</td></tr>
        <tr><td style="font-size:14px;line-height:1.6;color:#cbd5e1">${bodyHtml}</td></tr>
      </table>
      <div style="max-width:480px;color:#64748b;font-size:12px;padding-top:16px">Aperio · gestion de projet prédictive</div>
    </td></tr>
  </table></body></html>`;
}

function button(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;margin:20px 0;padding:12px 20px;background:${BRAND};color:#fff;text-decoration:none;border-radius:10px;font-weight:600">${label}</a>`;
}

export function verificationEmail(to: string, name: string, link: string): EmailMessage {
  return {
    to,
    subject: "Confirmez votre adresse e-mail — Aperio",
    html: shell(
      "Confirmez votre e-mail",
      `Bonjour ${name},<br><br>Bienvenue sur Aperio ! Confirmez votre adresse pour sécuriser votre compte.
       ${button(link, "Confirmer mon e-mail")}
       <br>Ce lien expire dans 24 heures. Si vous n'êtes pas à l'origine de cette inscription, ignorez cet e-mail.
       <br><br><span style="color:#64748b;font-size:12px">Lien direct : ${link}</span>`,
    ),
    text: `Bonjour ${name},\n\nConfirmez votre adresse e-mail Aperio : ${link}\n\nCe lien expire dans 24 heures.`,
  };
}

export interface AnomalyAlert {
  projectName: string;
  metric: string;
  severity: string;
  observed: number;
  expected: number;
  explanation: string;
  link: string;
}

export function anomalyAlertEmail(to: string, name: string, a: AnomalyAlert): EmailMessage {
  const color = a.severity === "critical" ? "#ef4444" : "#f59e0b";
  return {
    to,
    subject: `⚠️ Anomalie ${a.severity} — ${a.projectName}`,
    html: shell(
      "Anomalie détectée",
      `Bonjour ${name},<br><br>Aperio a détecté une anomalie sur <b>${a.projectName}</b>.
       <div style="margin:16px 0;padding:14px;border-left:3px solid ${color};background:#0b1120;border-radius:8px">
         <b style="color:${color};text-transform:uppercase;font-size:12px">${a.severity}</b><br>
         Métrique : <b>${a.metric}</b><br>
         Observé : <b>${a.observed}</b> (attendu ≈ ${a.expected})<br>
         <span style="color:#94a3b8">${a.explanation}</span>
       </div>
       ${button(a.link, "Voir le projet")}
       <br><span style="color:#64748b;font-size:12px">Vous recevez cet e-mail car les notifications sont activées sur votre compte.</span>`,
    ),
    text: `Anomalie ${a.severity} sur ${a.projectName}\nMétrique: ${a.metric} — observé ${a.observed} (attendu ~${a.expected})\n${a.explanation}\n\n${a.link}`,
  };
}

export interface DigestProject {
  name: string;
  anomalies: number;
  decisions: number;
}

export function weeklyDigestEmail(to: string, name: string, projects: DigestProject[], link: string): EmailMessage {
  const rows = projects
    .map(
      (p) =>
        `<tr><td style="padding:6px 0;color:#e2e8f0">${p.name}</td><td style="text-align:right;color:#f59e0b">${p.anomalies} anomalie(s)</td><td style="text-align:right;color:#94a3b8">${p.decisions} décision(s)</td></tr>`,
    )
    .join("");
  return {
    to,
    subject: "Votre résumé hebdomadaire — Aperio",
    html: shell(
      "Résumé de la semaine",
      `Bonjour ${name},<br><br>Voici l'activité de vos projets cette semaine :
       <table style="width:100%;margin:16px 0;font-size:14px">${rows}</table>
       ${button(link, "Ouvrir le tableau de bord")}`,
    ),
    text:
      `Résumé hebdomadaire Aperio\n\n` +
      projects.map((p) => `- ${p.name} : ${p.anomalies} anomalie(s), ${p.decisions} décision(s)`).join("\n") +
      `\n\n${link}`,
  };
}

/** Libellé et couleur par priorité de briefing (cohérent avec l'app). */
const PRIORITY_META: Record<BriefingPriority, { label: string; color: string }> = {
  critical: { label: "Critique", color: "#ef4444" },
  important: { label: "Important", color: "#f59e0b" },
  fyi: { label: "À surveiller", color: "#38bdf8" },
  win: { label: "Sur les rails", color: "#22c55e" },
};

/**
 * Briefing du matin par e-mail : la même synthèse priorisée que le tableau de
 * bord, poussée dans la boîte de réception. `baseUrl` sert à rendre cliquables
 * les actions du briefing (routes front relatives).
 */
export function briefingDigestEmail(
  to: string,
  name: string,
  briefing: Briefing,
  baseUrl: string,
): EmailMessage {
  const base = baseUrl.replace(/\/$/, "");
  const dash = `${base}/dashboard`;

  const rows = briefing.items
    .slice(0, 12)
    .map((it) => {
      const meta = PRIORITY_META[it.priority];
      const action = it.actions[0];
      const link = action ? `${base}${action.to}` : dash;
      return (
        `<div style="margin:12px 0;padding:12px 14px;border-left:3px solid ${meta.color};background:#0b1120;border-radius:8px">` +
        `<b style="color:${meta.color};text-transform:uppercase;font-size:11px">${meta.label}</b><br>` +
        `<span style="color:#e2e8f0;font-weight:600">${it.title}</span><br>` +
        `<span style="color:#94a3b8;font-size:13px">${it.detail}</span>` +
        (action ? `<br><a href="${link}" style="color:#60a5fa;font-size:13px">${action.label} →</a>` : "") +
        `</div>`
      );
    })
    .join("");

  const body = briefing.items.length
    ? `Bonjour ${name},<br><br>${briefing.greeting}` +
      `<div style="margin:12px 0;color:#94a3b8;font-size:13px">Santé du portefeuille : <b style="color:#e2e8f0">${briefing.health.score}/100</b> · risque ${briefing.health.risk}</div>` +
      rows +
      button(dash, "Ouvrir le tableau de bord")
    : `Bonjour ${name},<br><br>${briefing.greeting}<br><br>Rien ne requiert votre attention aujourd'hui.` +
      button(dash, "Ouvrir le tableau de bord");

  const text =
    `Briefing Aperio\n\n${briefing.greeting}\n` +
    `Santé : ${briefing.health.score}/100 (risque ${briefing.health.risk})\n\n` +
    briefing.items
      .slice(0, 12)
      .map((it) => `- [${PRIORITY_META[it.priority].label}] ${it.title} — ${it.detail}`)
      .join("\n") +
    `\n\n${dash}`;

  return {
    to,
    subject: `Votre briefing — ${briefing.counts.critical} critique(s), ${briefing.counts.important} à traiter`,
    html: shell("Votre briefing du jour", body),
    text,
  };
}

export function passwordResetEmail(to: string, name: string, link: string): EmailMessage {
  return {
    to,
    subject: "Réinitialisation de votre mot de passe — Aperio",
    html: shell(
      "Réinitialiser votre mot de passe",
      `Bonjour ${name},<br><br>Vous avez demandé à réinitialiser votre mot de passe.
       ${button(link, "Choisir un nouveau mot de passe")}
       <br>Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : votre mot de passe reste inchangé.
       <br><br><span style="color:#64748b;font-size:12px">Lien direct : ${link}</span>`,
    ),
    text: `Bonjour ${name},\n\nRéinitialisez votre mot de passe Aperio : ${link}\n\nCe lien expire dans 1 heure. Si ce n'est pas vous, ignorez cet e-mail.`,
  };
}
