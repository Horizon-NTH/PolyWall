# Architecture decisions

Architecture Decision Records explain the principal trade-offs observable in the current codebase. They document product constraints and engineering rationale without depending on the project's original academic context.

| ADR | Decision | Status |
|---|---|---|
| [001](001-nextjs.md) | modular Next.js web application | Accepted |
| [002](002-postgresql-prisma.md) | PostgreSQL and Prisma | Accepted |
| [003](003-s3-object-storage.md) | S3-compatible object storage | Accepted |
| [004](004-asynchronous-processing.md) | separate BullMQ worker | Accepted |

When a structural decision changes, add an ADR that explicitly supersedes the previous record instead of rewriting it.
