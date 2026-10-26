# Routes and interfaces

This is a map of internal entry points. Zod schemas and route tests remain the source of truth for exact fields and errors.

| Web route | Public | Purpose |
|---|:---:|---|
| `/login` | ✓ | user authentication |
| `/dashboard/**` | — | role- and organization-scoped administration |
| `/display` | ✓ | screen pairing and playback |

| API route | Purpose |
|---|---|
| `/api/auth/[...nextauth]` | Auth.js session and sign-in endpoints |
| `/api/display/pair` | submit pairing code and device identifier |
| `/api/display/state` | return pending, active, or revoked state |
| `/api/display/runtime` | return an active screen's broadcast snapshot |
| `/api/channels/[channelId]/display-preview` | build an authorized channel preview |
| `/api/media/upload-intents` | create media record and signed upload URL |
| `/api/media/upload-complete` | verify upload and enqueue processing |
| `/api/media/[mediaFileId]` | delete file from storage and database |
| `/api/media/[mediaFileId]/download-url` | create temporary read URL |
| `/api/display/widgets/weather` | normalized weather data |
| `/api/display/widgets/rss` | RSS feed items |
| `/api/display/widgets/transit` | configured transit departures |
| `/api/transit/providers` | available transit providers |
| `/api/transit/index` | searchable stops, routes, and destinations |

Administration mutations live in `src/actions` and generally follow: session → Zod validation → CASL authorization → Prisma mutation → structured logging → page revalidation.

<!-- @formatter:off -->
!!! warning "Internal contract"
    These routes are application internals, not a versioned public API. Third-party integrations need a defined contract, dedicated authentication, and compatibility policy.
<!-- @formatter:on -->
