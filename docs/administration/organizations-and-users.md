# Organizations and users

An organization is an isolated tenant that owns users, media, playlists, channels, screens, and local display templates.

## Create an organization

Only a platform administrator can create one:

1. Open **Organisations** and select **Créer**.
2. Enter a unique name and optional description.
3. Select the organization in the sidebar.
4. Create at least one organization administrator.

## Create users

Platform administrators create organization administrators from **Administrateurs**. Organization administrators create content managers from **Utilisateurs**. Email addresses are unique across the platform.

Use a temporary initial password and require it to be changed through an appropriate operational process.

## Disable before deleting

Disabling blocks sign-in while preserving the record and associated history. Prefer it for temporary departures or audit-sensitive environments.

<!-- @formatter:off -->
!!! danger "Organization deletion"
    Most organization-owned media, playlists, channels, screens, and relationships are deleted through cascading relations. Take and test a backup before deleting an organization in a real deployment.
<!-- @formatter:on -->
