# Prisma Seed Guide

This project uses `prisma/seed.ts` to populate reference data and demo fixtures.
The seed is create-only: it only inserts missing records and does not delete
existing data.

## How to run

```sh
pnpm prisma db seed
```

## Required environment

- `DATABASE_URL` (required): Postgres connection string.

## Optional environment

- `SEED_MODE`: `core` | `dev` | `prod`
    - Default: `dev` when `NODE_ENV` is not `production`.
    - Default: `prod` when `NODE_ENV=production`.
- `NODE_ENV`: If `production` and `SEED_MODE=dev`, the seed aborts.
- `DEV_PASSWORD`: Password used for dev users (default: `DevPassword123!`).
- `BOOTSTRAP_ADMIN_EMAIL`: Creates a platform super-admin in `prod` mode if missing.
- `BOOTSTRAP_ADMIN_PASSWORD`: Password for the bootstrap admin.
- `LOG_LEVEL`: Pino log level (default: `info`).
- `PINO_PRETTY`: Set to `false` to disable pretty logs.

## What it does

Core seed (always):

- Creates missing WidgetTypes: `clock`, `weather`, `rss`.

Dev seed (`SEED_MODE=dev`):

- Creates demo organizations, users, templates, zones, channels, screens, widgets,
  media items, playlists, and schedules if they do not already exist.
- Does not delete or overwrite existing rows.

Prod seed (`SEED_MODE=prod`):

- If `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` are set, creates a
  platform super-admin if missing.

## Media seeding

Seed media files can be placed in:

```
public/seed/media
```

- If the folder is empty or missing, placeholder media items are created.
- If files exist, media items are created only when a file's storage path is not
  already present in the database.
