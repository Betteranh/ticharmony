# TIC Harmony — Helpdesk Platform

## But du projet

Application web SaaS de helpdesk multi-client (inspirée NinjaOne), pour support interne (équipe) et support externe (clients payants). Tickets, statuts, priorités, commentaires, notifications, base de connaissances, dashboard.

## Périmètre

- Rôles : `SUPER_ADMIN`, `ADMIN`, `AGENT`, `CUSTOMER`.
- Multi-tenant : tenants `INTERNAL` (équipe) et `CLIENT` (entreprises clientes), cloisonnés via RLS PostgreSQL.
- Deux modes d'inscription : individus en self-serve payant (`/signup`), organisations provisionnées par un admin (`POST /api/tenants`).
- Langues : français / anglais (`next-intl`, routes `[locale]`).

## Setup / lancement

Prérequis : Node.js, npm, Docker (pour Postgres + Redis).

```bash
# 1. Dépendances (monorepo npm workspaces)
npm install

# 2. Infra locale (Postgres + Redis)
docker compose -f infra/docker/docker-compose.yml up -d

# 3. Config env
cp apps/api/.env.example apps/api/.env   # si absent : remplir DATABASE_URL, APP_DATABASE_URL, JWT_*, REDIS_URL, PORT, WEB_ORIGIN
cp apps/web/.env.example apps/web/.env.local  # API_URL

# 4. Migrations + seed
npm run --workspace=apps/api prisma migrate dev
npm run --workspace=apps/api db:seed

# 5. Lancer l'API et le web (deux terminaux)
npm run dev:api
npm run dev:web
```

## Structure générale

```
apps/
  api/        NestJS + Prisma + PostgreSQL — logique métier, auth, multi-tenant (RLS)
  web/        Next.js (App Router) — UI, routes [locale] pour FR/EN
packages/
  shared/     code partagé entre api et web
infra/
  docker/     docker-compose.yml (postgres, redis)
```
