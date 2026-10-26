# Security policy

## Reporting a vulnerability

Please do not disclose security vulnerabilities in a public issue.

Use GitHub's private vulnerability reporting feature from the repository's **Security** tab. Include the affected component, reproduction steps, expected impact, and any suggested mitigation. You should receive an initial acknowledgement within seven days.

## Supported versions

PolyWall is currently maintained as a portfolio project rather than a hosted service. Security fixes are applied to the latest revision of the default branch. older revisions are not supported.

## Deployment responsibility

Operators are responsible for replacing every example secret, enabling HTTPS, restricting PostgreSQL, Redis, and S3-compatible storage to trusted networks, applying dependency updates, and reviewing the documented production limitations.
