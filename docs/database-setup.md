# Database setup

## Production: table "Workflow" (or other tables) does not exist

If you see:

```text
The table `public.Workflow` does not exist in the current database.
```

the production database schema is out of date. Apply the current Prisma schema to the database.

### Option 1: Push schema (recommended for a quick fix)

With `DATABASE_URL` pointing at your **production** database:

```bash
npm run db:push
```

This creates or updates tables to match `prisma/schema.prisma` without using migration history. Safe to run; it will not drop data.

Use this when:

- You need prod working immediately.
- You are not yet using Prisma migrations in production.

### Option 2: Migrate deploy (when migrations are PostgreSQL-compatible)

If you have run migrations for PostgreSQL in this project:

```bash
npm run db:migrate:deploy
```

**Note:** The migrations in this repo were generated for SQLite (e.g. `PRAGMA`, `DATETIME`). They are not valid for PostgreSQL. To use `migrate deploy` in production you must either:

- Add a new baseline migration that creates all tables in PostgreSQL syntax and mark previous migrations as applied, or  
- Regenerate migrations with `provider = "postgresql"` in `schema.prisma`.

Until then, use **Option 1** (`db:push`) for production.

## Local development

- **SQLite:** Use `db:push` or run migrations if your local DB is SQLite and matches the migration SQL.
- **PostgreSQL:** Use `db:push` to sync the schema, or run PostgreSQL-compatible migrations once you have them.

## Seed (optional)

After the schema is applied:

```bash
npm run db:seed
```
