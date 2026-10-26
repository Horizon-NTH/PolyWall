# Configuration

Runtime settings are read from `.env`. Never commit a file containing real credentials.

## Core services

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection used by Prisma |
| `AUTH_SECRET` | long, random Auth.js signing secret |
| `AUTH_URL` | public application URL |
| `AUTH_TRUST_HOST` | trust the reverse proxy host header |
| `REDIS_URL` | Redis connection for BullMQ and rate limits |
| `RATE_LIMIT_DISABLED` | disable rate limits in controlled tests only |

## Object storage

| Variable | Purpose |
|---|---|
| `STORAGE_DRIVER` | storage driver, currently `s3` |
| `S3_ENDPOINT` | internal S3 or MinIO endpoint |
| `S3_PUBLIC_BASE_URL` | endpoint reachable by browsers |
| `S3_REGION` | S3 region |
| `S3_BUCKET` | media bucket |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | service credentials |
| `S3_FORCE_PATH_STYLE` | required by some MinIO deployments |

Internal and public S3 endpoints may differ. Signed URLs returned to browsers must use a routable HTTPS address.

## Uploads and bootstrap

| Variable | Example | Purpose |
|---|---:|---|
| `UPLOAD_MAX_BYTES` | 1073741824 | maximum upload size |
| `UPLOAD_URL_TTL_SECONDS` | 900 | upload URL lifetime |
| `DOWNLOAD_URL_TTL_SECONDS` | 300 | download URL lifetime |
| `SEED_MODE` | `prod` | disable demo data in production |
| `BOOTSTRAP_ADMIN_EMAIL` | — | first platform administrator |
| `BOOTSTRAP_ADMIN_PASSWORD` | — | initial password |

Remove bootstrap variables after creating the account and rotate its password. `LOG_LEVEL` controls verbosity. use structured JSON in production and `LOG_PRETTY=true` only for readable development output.
