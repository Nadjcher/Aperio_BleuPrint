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
- **JWT d'accès** court (15 min) + **refresh token** rotatif (7 j), stocké haché
  (SHA-256) et révocable.
- Comparaison de mot de passe à temps constant même si l'utilisateur n'existe
  pas, pour limiter les oracles de timing.
- Limiteur strict sur les routes d'authentification (anti brute-force).

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
| Effacement | `DELETE /api/v1/gdpr/me` | Suppression complète ; audit anonymisé (actorId → null) |

Principes appliqués : minimisation (pas d'email brut dans les signaux, IP
tronquée), consentement traçable, et conservation limitée.

## Réponse à incident

1. **Détection** — alerting sur accès anormaux et erreurs de sécurité (journal d'audit).
2. **Containment** — révocation de tous les tokens de l'utilisateur, isolation du compte.
3. **Notification** — information sous 72 h en cas de violation (obligation RGPD).
4. **Post-mortem** — analyse de cause racine et correctif.

## À faire avant la production

- [ ] Remplacer tous les secrets `change-me` et la `FIELD_ENCRYPTION_KEY` de dev.
- [ ] Désactiver `synchronize` TypeORM au profit de migrations versionnées.
- [ ] Terminaison TLS en frontal (reverse proxy) et HSTS.
- [ ] Rotation des secrets et gestion via un coffre (vault).
- [ ] SOC 2 (optionnel) si des clients entreprise l'exigent.
