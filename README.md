# Brillanda

School results & records management platform: multi-tenant SaaS for sessions, classes,
students, score entry, automated results, report cards and publishing to parents.

- **Scope:** Brillanda BRD v1 (put a copy in `docs/`)
- **How it's built:** Engineering Build Guide (put a copy in `docs/`)
- **Every deviation or open decision:** [DECISIONS.md](DECISIONS.md)

## Prerequisites

- Node.js 20.19+ (22 recommended)
- Docker Desktop (runs Postgres, Redis and Mailpit)

## First run

```sh
cp apps/api/.env.example apps/api/.env
npm install
npm run db:up        # start Postgres, Redis, Mailpit
npm run db:migrate   # create tables
npm run db:seed      # demo school
npm run dev:api      # http://localhost:4000/api/v1/health
npm run dev:web      # http://localhost:5173
```

Emails sent in development land in Mailpit: http://localhost:8025

## Demo accounts

All use the password `Password123!`

| Role | Email |
|---|---|
| Super admin | superadmin@brillanda.local |
| School admin | admin@demo-academy.local |
| Teacher (Mathematics, Basic Science; class teacher JSS 1A) | tunde.bakare@demo-academy.local |
| Teacher (English Language) | amaka.eze@demo-academy.local |
| Parent (child: Chiamaka Obi) | parent@demo-academy.local |

## Layout

```
apps/api               Express + Prisma API
  prisma/              schema, migrations, seed
  src/modules/<name>/  router.ts · service.ts · schema.ts · <name>.test.ts
  src/middleware/      auth, rbac, tenant scope, errors
  src/lib/             prisma client, env, defaults, shared helpers
apps/web               React + Vite + Tailwind
packages/shared-types  types shared by api and web
```

## Useful scripts

| Command | What it does |
|---|---|
| `npm test` | Run all test suites (needs Docker running; uses the separate `brillanda_test` database) |
| `npm run typecheck` | Type-check every workspace |
| `npm run db:reset` | Drop, re-migrate and re-seed the local database |
| `npm run db:down` | Stop the Docker services (data is kept) |
