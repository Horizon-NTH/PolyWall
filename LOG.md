# Logging

Le logging serveur utilise `pino` et produit des événements structurés.

Champs principaux:

- `event`, `action`, `status`
- `organizationId`, `actorUserId`, `targetId`
- `durationMs`
- `error` (message + code Prisma si présent)

Variables d'environnement:

- `LOG_LEVEL` (par défaut: `debug` en dev, `info` en prod, `silent` en test)
- `LOG_PRETTY` (`true` pour activer un format lisible en dev)

Exemple:

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