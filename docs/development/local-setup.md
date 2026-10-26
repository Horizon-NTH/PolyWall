# Local setup

Docker is the recommended path because it provides PostgreSQL, Redis, MinIO, and the media worker's native tools.

## Requirements

- Node.js compatible with Next.js 16
- pnpm 10.32.1
- Docker with Compose.

## Complete environment

```bash
pnpm install
cp .env.example .env
pnpm docker:dev
```

On the first launch, run in another terminal:

```bash
pnpm exec prisma migrate dev
pnpm db:seed
```

The application is available at `http://localhost:3000`, the player at `http://localhost:3000/display`, and the MinIO console on port 9001.

Development seed mode creates demo organizations, accounts for each role, templates, channels, schedules, and screens. Optional media files and their seed behavior are documented in `prisma/SEED.md`.

The application can run with `pnpm dev` when external PostgreSQL, Redis, and S3-compatible services are reachable. Running `pnpm worker:media` outside Docker additionally requires FFmpeg/ffprobe, Poppler, and LibreOffice.

Common failures include occupied ports, a missing bucket, unapplied migrations, missing widget seed data, or a stopped `polywall-media-worker-dev` container.
