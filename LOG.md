# Logging

Server-side logging uses `pino` and emits structured events.

Main fields:

- `event`, `action`, `status`
- `organizationId`, `actorUserId`, `targetId`
- `durationMs`
- `error` (message and Prisma code when available)

Environment variables:

- `LOG_LEVEL` (defaults to `debug` in development, `info` in production, and `silent` in tests)
- `LOG_PRETTY` (`true` enables human-readable development output)

Example:

```json
{
  "level": 30,
  "time": "2026-02-05T12:34:56.000Z",
  "app": "polywall",
  "env": "development",
  "event": "user.create",
  "action": "create",
  "status": "success",
  "organizationId": "org_123",
  "actorUserId": "user_456",
  "targetId": "user_789",
  "durationMs": 42
}
```
