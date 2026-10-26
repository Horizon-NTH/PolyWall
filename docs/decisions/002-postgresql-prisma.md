# ADR 002 — PostgreSQL and Prisma

**Status:** Accepted

## Context

Organizations, users, media, playlists, schedules, channels, and screens form a relational graph with uniqueness rules and controlled deletion.

## Decision

Use PostgreSQL as the primary database and Prisma for schema definition, migrations, and typed TypeScript access.

## Rationale

- transactions and relational constraints
- versioned migrations
- generated types aligned with the schema
- explicit tenant-scoped queries
- strong date, time, JSON, and indexing support.

## Consequences

Tenant separation remains an application responsibility, so every query must preserve authorization context. Flexible template and widget JSON requires strict Zod validation at system boundaries.
