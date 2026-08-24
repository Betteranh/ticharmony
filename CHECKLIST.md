# CHECKLIST — TIC Harmony

## Avant de coder

- [ ] Lire [SESSION.md](SESSION.md) pour reprendre le contexte de la dernière session.
- [ ] Vérifier que la tâche est dans le périmètre MVP ([SPEC.md](SPEC.md) — inclus/exclus).
- [ ] Si une info manque ou qu'un choix impacte le scope/l'architecture, poser la question avant de coder.
- [ ] Vérifier qu'aucune décision équivalente n'existe déjà dans [DECISIONS.md](DECISIONS.md).

## Pendant le codage

- [ ] Respecter le découpage `apps/api` (métier, données, auth) / `apps/web` (UI) / `packages/shared` (code commun).
- [ ] Toute requête DB applicative passe par le rôle restreint (`APP_DATABASE_URL`), jamais par le rôle owner Prisma (`DATABASE_URL`).
- [ ] Toute nouvelle donnée sensible au tenant est protégée par RLS — pas de filtrage `WHERE tenantId = ...` manuel comme seule protection.
- [ ] Code modulaire, propre, sans sur-ingénierie (pas d'abstraction pour un besoin hypothétique).
- [ ] Textes UI passés par le système i18n (FR/EN), jamais en dur.
- [ ] Pas de fonctionnalité hors MVP ajoutée sans validation (assets, SLA, automatisations, WhatsApp, reporting, paiement réel).

## Avant de terminer une session

- [ ] Mettre à jour [SESSION.md](SESSION.md) : état, fichiers modifiés, tâches terminées, prochain objectif, blocages.
- [ ] Si un choix structurant a été fait, l'ajouter à [DECISIONS.md](DECISIONS.md).
- [ ] Si le périmètre a changé durablement, proposer une mise à jour de [SPEC.md](SPEC.md) ou [README.md](README.md).
- [ ] Vérifier qu'il ne reste pas de code mort, de TODO silencieux ou de placeholder non signalé.

## Sécurité

- [ ] Aucun secret (JWT, DB, API keys) commité — tout passe par `.env` (non versionné).
- [ ] Toute route sensible vérifie le rôle (`SUPER_ADMIN`/`ADMIN`/`AGENT`/`CUSTOMER`) et le tenant de l'utilisateur.
- [ ] Mots de passe hashés (argon2), jamais stockés/loggés en clair.
- [ ] Validation des entrées côté API (`class-validator`) sur tout endpoint exposé.
- [ ] Pas de données d'un tenant accessibles depuis un autre tenant, même via un bug applicatif (RLS = dernier filet).

## Tests et validation

- [ ] `npm run lint` sur les workspaces touchés avant de considérer une tâche terminée.
- [ ] Tests unitaires (`test`) et e2e (`test:e2e`) côté `apps/api` pour toute logique métier ajoutée/modifiée.
- [ ] Vérification manuelle du flow concerné (ex : signup, création ticket) en local avant de clore.
- [ ] Pour un changement de schéma Prisma : migration créée et testée (`prisma migrate dev`), pas de modif manuelle en base.
