# Security

PolyWall combines account authentication, role-based authorization, logical tenant isolation, and temporary object-storage access.

- Auth.js manages sessions. Argon2 hashes passwords.
- Disabled accounts are rejected and sign-in attempts are rate-limited.
- CASL applies role and `organizationId` conditions on the server.
- The media bucket is private. uploads and reads use short-lived signed URLs.
- Pairing codes are stored as expiring hashes rather than plaintext.

## Tenant isolation

Isolation is enforced primarily by application queries, CASL conditions, and Prisma relationships. PostgreSQL Row-Level Security is not currently enabled. Every new query must include organization context or call a service that guarantees it.

## External content

Weather, RSS, and transit services normalize external data before rendering. Interactive URLs are loaded by the display client. only approve trusted origins that permit iframe embedding.

<!-- @formatter:off -->
!!! danger "Production baseline"
    Use HTTPS, replace all example secrets, keep PostgreSQL, Redis, and MinIO on private networks, restrict platform-administrator access, centralize logs, and apply dependency and container updates.
<!-- @formatter:on -->

Known limitations include no documented SSO integration, no database RLS, no interactive inactivity timeout, and reliance on deployment-level proxy, network, and secret-management controls.
