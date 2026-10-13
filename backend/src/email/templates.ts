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
