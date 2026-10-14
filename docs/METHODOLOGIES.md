# Méthodologies de gestion de projet — référence & plan d'intégration

> Document de cadrage pour la **Phase 3** (sélecteur de méthodologie par projet).
> Il définit le vocabulaire, le mappe à l'existant Aperio, et pose le plan.
> Rien n'est encore implémenté ici : c'est la base de travail.

## 1. Définitions (courtes et exactes)

### Scrum (agile itératif)
Cadre itératif en **sprints** (itérations de 1 à 4 semaines).
Objets : *Product Backlog*, *Sprint Backlog*, **vélocité** (points livrés/sprint),
*Burndown* (reste à faire dans le temps). Rôles : Product Owner, Scrum Master,
équipe de développement.

### Kanban (flux continu)
Pas d'itérations : un **flux** de tâches à travers des colonnes.
Objets : **limites de WIP** (travail en cours), *lead time* / *cycle time*,
*cumulative flow*. Le plus simple à adopter → **méthodologie par défaut**.

### SAFe — Scaled Agile Framework (agile à l'échelle)
Agile coordonné sur plusieurs équipes. Hiérarchie **Epic → Feature → Story**.
*PI (Program Increment)* ≈ 8–12 semaines, *ART (Agile Release Train)*.
Priorisation par **WSJF** (Weighted Shortest Job First = coût du retard / taille).

### PRINCE2 — PRojects IN Controlled Environments (prédictif, par étapes)
Méthode par **étapes (stages)** et gouvernance.
Objets : *Business Case*, *Work Packages*, **tolérances** (coût / délai / qualité),
*Highlight Report* (statut régulier), *Exception Report* (dépassement de tolérance),
*Project Board*.

### PMI / PMBOK (référentiel par domaines)
Vocabulaire : *WBS* (découpage du travail), **chemin critique**, *registre des
risques*, **EVM** (Earned Value : indices **SPI** délai et **CPI** coût).

### OKR (alignement stratégique)
*Objectives* + *Key Results* mesurables. Transverse aux méthodologies.

## 2. Mapping avec l'existant Aperio

| Concept méthodo | Déjà présent dans Aperio | À ajouter (Phase 2/3) |
| --- | --- | --- |
| Vélocité / tendances | ✅ forecast + analyse de gravité | relier aux sprints |
| Risques / alertes | ✅ anomalies + décisions | **registre des risques** + tolérances |
| Compte-rendu | ✅ Reporter + briefing | formats *Highlight* (PRINCE2), statut PMI |
| Ressources | ✅ membres / affectations | capacité par sprint, surallocation |
| Gouvernance | ✅ approbation des décisions | tolérances + escalade (Exception) |
| Planning | ❌ | **jalons, échéances, dépendances** (Phase 2) |
| Budget / coûts | ❌ | reporté après la Phase 3 (décision produit) |

## 3. Plan d'intégration (Phase 3)

Objectif : **un même moteur, un vocabulaire et des vues configurés par
méthodologie** — pas de duplication de logique.

1. **Sélecteur de méthodologie par projet** : Kanban (défaut) → Scrum →
   PRINCE2 → SAFe. Stocké sur le projet (migration).
2. **Couche de vocabulaire par méthodologie** : réutilise le mécanisme déjà en
   place (`frontend/src/lib/vocab.ts`) en le paramétrant par méthodologie
   (ex. « itération » = *sprint* en Scrum, *stage* en PRINCE2).
3. **Vues configurées** :
   - Scrum : sprints, vélocité, burndown.
   - Kanban : colonnes de flux, limites WIP, temps de cycle.
   - PRINCE2 : étapes, tolérances, rapports d'exception.
   - SAFe : epics, features, PI.
4. **Registre des risques** : probabilité × impact, propriétaire, tolérance,
   **alimenté par les anomalies existantes**.
5. **Rapports normés** générés par le Reporter : *Highlight* PRINCE2, statut
   PMI, burndown Scrum.

**Critère d'acceptation (rappel)** : changer de méthodologie modifie le
vocabulaire et les vues **sans perte de données** ni régression sur les autres
méthodologies.

## 4. Choix de conception pour « facile ET technique »

- **Mode simple** (défaut) : masque le jargon, montre santé / risque / à-faire.
- **Mode expert** : révèle WSJF, EVM (SPI/CPI), chemin critique, etc.
- **Glossaire + infobulles** (déjà en place) : chaque terme spécialisé est
  expliqué dans l'interface — l'utilisateur monte en compétence sans quitter
  l'app.

> Statut actuel (fin Phase 1) : mode simple/expert, glossaire et vocabulaire
> métier **livrés**. Les objets de planning (Phase 2) et le sélecteur de
> méthodologie (Phase 3) restent à construire.
