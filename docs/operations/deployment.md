# Deployment

The supplied Docker Compose stack separates the web application, media worker, PostgreSQL, Redis, and MinIO-compatible object storage.

```mermaid
flowchart TB
    U["Administration browsers"] -->|HTTPS| A["Next.js application"]
    D["/display screens"] -->|HTTPS| A
    A --> P[(PostgreSQL)]
    A --> R[(Redis / BullMQ)]
    A --> S[(S3 / MinIO)]
    W["Media worker"] --> R
    W --> P
    W --> S
```

## Requirements

- Docker with Compose
- a domain and HTTPS reverse proxy
- persistent PostgreSQL and object-storage volumes
- enough CPU, memory, and temporary space for media conversion.

## First deployment

1. Copy `.env.example` to `.env` and replace every example credential.
2. Use Docker service names (`postgres`, `redis`, and `minio`) for internal endpoints.
3. Configure public application and storage URLs.
4. Start data services, apply migrations, and run the production seed.
5. Start the application and worker.

```dotenv
DATABASE_URL=postgresql://polywall:replace-me@postgres:5432/polywall?schema=public
REDIS_URL=redis://redis:6379
S3_ENDPOINT=http://minio:9000
S3_PUBLIC_BASE_URL=https://media.example.org
AUTH_URL=https://polywall.example.org
```

```bash
docker compose -f docker-compose.yaml build
docker compose -f docker-compose.yaml up -d postgres redis minio minio-init
docker compose -f docker-compose.yaml run --rm media-worker pnpm exec prisma migrate deploy
docker compose -f docker-compose.yaml run --rm -e SEED_MODE=prod media-worker pnpm db:seed:direct
docker compose -f docker-compose.yaml up -d app media-worker
```

<!-- @formatter:off -->
!!! warning
    `.env.example` targets host-based development and uses `localhost`. Inside Compose, `localhost` refers to the current container. Also ensure `S3_PUBLIC_BASE_URL` is reachable by screen browsers. the internal `minio` service name is not public.
<!-- @formatter:on -->

Expose only the HTTPS application endpoint and, when needed, a protected public media endpoint. Keep PostgreSQL, Redis, and internal MinIO APIs private.

Before upgrading, back up PostgreSQL and the object bucket, review migrations, rebuild images, apply migrations, then test one import and one display workflow.
