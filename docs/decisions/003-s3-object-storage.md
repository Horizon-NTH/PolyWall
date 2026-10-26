# ADR 003 — S3-compatible object storage

**Status:** Accepted

## Context

Videos, presentations, and rendered variants can be large. They should not pass entirely through Next.js or be stored in PostgreSQL.

## Decision

Store files in an S3-compatible service, use MinIO during development, and use signed URLs for uploads and reads.

## Rationale

- direct browser uploads
- private buckets and temporary access
- scaling independent from the web server
- local compatibility through MinIO
- separation of relational metadata and binary objects.

## Consequences

PostgreSQL and object storage must be backed up consistently. Internal and browser-reachable S3 addresses may differ. CORS, signed-URL lifetime, and orphan cleanup become operational concerns.
