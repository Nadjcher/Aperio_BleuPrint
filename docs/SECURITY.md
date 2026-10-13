# Sécurité & RGPD

La sécurité est intégrée dès le départ, couche par couche, de l'extérieur vers
la donnée.

## Les 4 couches de défense

| Couche | Protection | Mise en œuvre dans le code |
| --- | --- | --- |
| 1. Réseau | HTTPS/TLS, rate limiting, CORS | `security/index.ts` (helmet, cors, express-rate-limit) |
| 2. Auth | Identité et sessions | JWT + refresh rotatif, bcrypt (`authService.ts`) |
| 3. API | Autorisation et validation | RBAC (`rbac.ts`), validation zod (`validate.ts`), audit (`auditService.ts`) |
| 4. Données | Chiffrement et isolation | AES-256-GCM au repos (`crypto.ts`), isolation par propriétaire |

## Authentification

- Mots de passe hachés avec **bcrypt** (12 rounds), jamais stockés en clair.
- **Politique de mot de passe** : ≥ 12 caractères, au moins une lettre et un
  chiffre, rejet des bases triviales (`security/password.ts`).
- **JWT d'accès** court (15 min) avec claims **issuer/audience** vérifiés + **refresh
  token** rotatif (7 j), stocké haché (SHA-256) et révocable.
- **Détection de réutilisation du refresh token** : si un token déjà rotaté
  (révoqué) ressurgit, c'est le signe d'un vol → **toute la famille de tokens de
  l'utilisateur est révoquée** (`authService.refresh`).
- Comparaison de mot de passe à temps constant même si l'utilisateur n'existe
  pas, pour limiter les oracles de timing.
- Limiteur strict sur les routes d'authentification (anti brute-force).

## En-têtes de sécurité HTTP

Via helmet : **CSP** (`default-src 'self'`, `frame-ancestors 'none'`,
`object-src 'none'`, `base-uri 'self'`), **HSTS** (prod, 180 j, includeSubDomains,
preload), `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, suppression de `X-Powered-By`.

## E-mail : réinitialisation & vérification

Couche e-mail à **dégradation gracieuse** (`email/index.ts`) : sans provider
configuré (`EMAIL_PROVIDER=none`, défaut), les e-mails sont journalisés et
l'inscription reste directe ; avec **Resend** (`EMAIL_PROVIDER=resend` +
`RESEND_API_KEY`), ils sont envoyés pour de vrai.

- **Mot de passe oublié** : `POST /auth/forgot-password` renvoie toujours `202`
  (anti-énumération), et n'envoie un lien que si le compte existe. Le lien
  (`POST /auth/reset-password`) est un **jeton à usage unique**, haché en base,
  valable 1 h ; après reset, **toutes les sessions sont révoquées**.
- **Vérification d'e-mail** : jeton à usage unique valable 24 h
  (`POST /auth/verify-email`). Le 1er compte (admin) est auto-vérifié. Non
  bloquant par défaut ; `REQUIRE_EMAIL_VERIFICATION=true` exige un e-mail
  confirmé à la connexion.

## Autorisation (RBAC)

Trois rôles hiérarchiques : `viewer` < `manager` < `admin`. Le premier compte
inscrit devient `admin`. Les actions sensibles (création de projet,
synchronisation, feedback) exigent au moins `manager`.

## Validation & audit

- Toutes les entrées sont validées par des schémas **zod** avant traitement.
- Un **journal d'audit** trace les actions clés (connexion, export, effacement,
  synchronisation) avec IP tronquée (minimisation).

## Chiffrement au repos

`crypto.ts` fournit un chiffrement symétrique **AES-256-GCM** pour les champs
sensibles, avec IV aléatoire et tag d'authentification. La clé provient de
`FIELD_ENCRYPTION_KEY` (32 octets).

## Droits RGPD implémentés

| Droit | Endpoint | Détail |
| --- | --- | --- |
| Accès & portabilité | `GET /api/v1/gdpr/export` | Export JSON structuré de toutes les données |
| Rectification | `PATCH /api/v1/auth/me` | Mise à jour du profil (nom) |
| Effacement | `DELETE /api/v1/gdpr/me` | Suppression complète ; audit anonymisé (actorId → null) |

Principes appliqués : minimisation (pas d'email brut dans les signaux, IP
tronquée), consentement traçable, et **conservation limitée** — une purge
périodique (`maintenanceService`, portée par le worker) supprime les journaux
d'audit au-delà de `AUDIT_RETENTION_DAYS` (365 j par défaut) et les refresh
tokens expirés/révoqués.

## Réponse à incident

1. **Détection** — alerting sur accès anormaux et erreurs de sécurité (journal d'audit).
2. **Containment** — révocation de tous les tokens de l'utilisateur, isolation du compte.
3. **Notification** — information sous 72 h en cas de violation (obligation RGPD).
4. **Post-mortem** — analyse de cause racine et correctif.

## À faire avant la production

- [ ] Remplacer tous les secrets `change-me` et la `FIELD_ENCRYPTION_KEY` de dev.
- [x] Désactiver `synchronize` TypeORM au profit de migrations versionnées.
- [x] HSTS activé côté app (prod) ; terminaison TLS en frontal (reverse proxy) à prévoir.
- [ ] Rotation des secrets et gestion via un coffre (vault).
- [ ] SOC 2 (optionnel) si des clients entreprise l'exigent.
