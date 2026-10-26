# Backup and monitoring

PolyWall stores related state in PostgreSQL and object storage. A useful backup must cover both, plus deployment configuration and externally managed secrets.

Redis mainly contains queue and transient state. backing it up does not replace database and bucket backups.

## Minimum strategy

1. Export PostgreSQL daily.
2. Version or replicate the media bucket.
3. Keep multiple generations away from the primary host.
4. Test restoration in an isolated environment.
5. Define the expected recovery point and recovery time objectives.

## Signals to monitor

| Signal | Risk |
|---|---|
| application unavailable | administration and runtime refresh fail |
| stopped worker or growing queue | media remains unprocessed |
| Redis unavailable | jobs and rate limiting are disrupted |
| low object-storage capacity | uploads and conversions fail |
| PostgreSQL latency or outage | display state cannot be resolved |
| stale screen `lastSeenAt` | offline device or closed browser |
| increasing 401, 429, or 5xx responses | invalid access, throttling, or outage |

Pino events include action, status, organization, actor, target, duration, and error context. Centralize application and worker logs and treat them as potentially sensitive. Metrics, alerts, and distributed tracing are deployment responsibilities and are not bundled with the repository.
