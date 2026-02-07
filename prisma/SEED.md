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
- `STORAGE_DRIVER`: Defaults to `s3`.
- `S3_ENDPOINT`: Defaults to `http://localhost:9000` (MinIO local).
- `S3_REGION`: Defaults to `eu-west-3`.
- `S3_BUCKET`: Defaults to `polywall-dev`.
- `S3_ACCESS_KEY_ID`: Defaults to `polywall`.
- `S3_SECRET_ACCESS_KEY`: Defaults to `polywallsecret`.
- `S3_FORCE_PATH_STYLE`: Defaults to `true` (recommended for MinIO).

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
- If files exist:
    - each file is uploaded to object storage (`S3_BUCKET`) under
      `org/{organizationId}/seed/media/{fileName}`
    - media rows are created only when `(storageBucket, objectKey)` does not
      already exist in the database.

Recommended sample files for UI testing:

- images: `.jpg`, `.png`, `.webp`, `.gif`
- video: `.mp4`
- document: `.pdf`
- slides: `.pptx`
