# ADR 004 — Asynchronous media processing

**Status:** Accepted

## Context

Analyzing video or converting presentations can be slow, resource-intensive, and dependent on native binaries.

## Decision

Use BullMQ with Redis and run conversions in a separate Docker worker.

## Rationale

- fast web responses after upload
- job retries and status tracking
- isolated FFmpeg, Poppler, and LibreOffice dependencies
- independently scalable workers
- visible processing states in the media library.

## Consequences

Redis is required by the processing pipeline. Jobs must tolerate retries without producing inconsistent variants. Concurrency limits must account for memory and temporary disk use.
