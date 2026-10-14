# Conformité — RGPD, cookies, accessibilité (France)

Ce document est un **registre interne** et une **checklist**. Il ne constitue pas
un avis juridique ; pour un usage commercial, faites relire les textes par un
professionnel. Juridiction visée : **France** (RGPD + ePrivacy/CNIL + LCEN).

## 1. Données personnelles traitées (registre)

| Donnée | Finalité | Base légale | Conservation |
| --- | --- | --- | --- |
| E-mail, nom | Compte, connexion, communications | Exécution du contrat (CGU) | Tant que le compte est actif / jusqu'à effacement |
| Mot de passe (haché bcrypt) | Authentification | Exécution du contrat | Idem compte |
| Rôle, statut (invité, e-mail vérifié) | Contrôle d'accès | Intérêt légitime | Idem compte |
| Jetons (refresh, usage unique) — hachés | Sessions, reset, vérification | Exécution du contrat | 7 j / 1 h–24 h, purge auto |
| Projets, dépôts suivis, signaux, anomalies, décisions, feedback | Fourniture du service | Exécution du contrat | Jusqu'à suppression du projet/compte |
| Journal d'audit (action, cible, **IP tronquée**, horodatage) | Sécurité, preuve | Intérêt légitime | 12 mois (`AUDIT_RETENTION_DAYS`) puis purge |
| Préférence de notification | Envoi d'e-mails | Consentement | Idem compte |

**Non collecté** : données sensibles, données de paiement (pas de facturation),
géolocalisation, cookies publicitaires, profilage marketing.

## 2. Sous-traitants / destinataires

| Prestataire | Rôle | Pays | Point d'attention |
| --- | --- | --- | --- |
| Neon | Base de données | **USA** | Transfert hors UE |
| Render | Hébergement API | **USA** | Transfert hors UE |
| Vercel | Hébergement front | **USA** | Transfert hors UE |
| GitHub | Lecture de dépôts publics | USA | Données publiques |
| Resend (si activé) | Envoi d'e-mails | **USA** | Transfert hors UE |
| Groq / Anthropic (si activé) | Enrichissement LLM | **USA** | Transfert hors UE |

### ⚠️ Transferts hors UE — action recommandée

La base Neon a été créée en région **AWS US East 2 (Ohio)** et les hébergeurs
sont américains. Traiter des e-mails d'utilisateurs européens aux USA nécessite
des **garanties appropriées** (Clauses Contractuelles Types et/ou EU-US Data
Privacy Framework). Deux options :

1. **Recommandé** : recréer les services en **région UE** pour éviter le
   transfert — Neon (Frankfurt / `AWS eu-central-1`), Render (Frankfurt), Vercel
   (région/edge UE). C'est la voie la plus simple pour la conformité.
2. Sinon : vérifier et conserver les **DPA** (accords de sous-traitance) de
   chaque prestataire et leur adhésion au Data Privacy Framework, et mentionner
   ces garanties dans la politique de confidentialité (déjà fait).

## 3. Cookies / traceurs

- **Aucun** cookie de mesure d'audience, publicité ou tiers.
- Stockage local strictement nécessaire : `pm.accessToken`, `pm.refreshToken`
  (maintien de session, demandé par l'utilisateur).
- → **Pas de bannière de consentement requise** (exemption CNIL « strictement
  nécessaire »). À réévaluer si un outil d'analytics est ajouté.

## 4. Droits des personnes (implémentés)

| Droit | Mécanisme |
| --- | --- |
| Accès / portabilité | `GET /api/v1/gdpr/export` (JSON) |
| Rectification | `PATCH /api/v1/auth/me` |
| Effacement | `DELETE /api/v1/gdpr/me` (audit anonymisé) |
| Opposition (notifications) | préférence `notifyByEmail` |
| Réclamation | CNIL — cnil.fr |

## 5. Accessibilité (objectif WCAG 2.1 AA)

- **Contrastes** : audit réalisé ; les textes `slate-500/600` (< 4.5:1) ont été
  remontés à `slate-400` (≥ 7:1 sur fond sombre). Les autres passent AA.
- **Images** : l'app n'utilise pas de balises `<img>` de contenu ; les icônes
  SVG sont décoratives (`aria-hidden="true"`). Le visuel hero sert uniquement au
  partage social (Open Graph) avec titre/description associés.
- **Navigation** : lien d'évitement « Aller au contenu », repères sémantiques
  (`header`/`nav`/`main`/`footer`), `lang="fr"`, focus visible au clavier,
  préférence `prefers-reduced-motion` respectée.
- **Agents IA / moteurs** : `robots.txt`, `llms.txt`, données structurées
  JSON-LD, métadonnées Open Graph/Twitter, HTML sémantique.

## 6. Checklist avant mise en ligne publique

- [ ] Compléter l'identité de l'éditeur dans `frontend/src/pages/LegalPages.tsx`
      (`EDITOR` : nom, adresse, e-mail de contact).
- [ ] Décider des **régions UE** (Neon/Render/Vercel) OU archiver les DPA des
      prestataires US (voir §2).
- [ ] Mettre le domaine réel dans `robots.txt` (ligne `Sitemap:`) et, si besoin,
      générer un `sitemap.xml`.
- [ ] Réinitialiser le mot de passe Neon partagé en clair pendant le déploiement.
- [ ] Relecture juridique des 4 pages légales si usage commercial.
- [ ] Si ajout de paiement un jour : CGV, droit de rétractation, politique de
      remboursement, information précontractuelle.
