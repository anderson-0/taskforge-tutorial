# TaskForge Next.js setup

## Prerequisites

- Node.js 24.x
- npm

From the repository root:

```bash
cd nextjs
cp .env.example .env
npm ci
npm run db:setup
npm run dev
```

Open <http://localhost:3000> and sign in with `alice@example.com` and
`password123`. The other development accounts are listed in `README.md`.

## Verify the setup

```bash
./verify-setup.sh
```

The script checks the Node version, installs exactly the locked dependencies,
applies the committed database migrations, loads deterministic sample data,
and runs lint, type checking, coverage, the legacy SQLite compatibility check,
the production build, and the production dependency audit.

The seed command upserts only the stable sample records. It does not delete
users, projects, or tasks you created during an exercise. Use `npm run
db:reset` only when you intentionally want a fresh local database.

## Reset the database

```bash
npm run db:reset
```

Prisma asks for no confirmation because this command is explicitly for the
ignored local development database. The script reapplies migrations and then
runs the configured seed command explicitly, as required by Prisma 7.

## Useful commands

```bash
npm run dev
npm run verify
npx prisma studio
```

The example secret and sample credentials are for local learning only. Do not
deploy them or reuse them elsewhere.
