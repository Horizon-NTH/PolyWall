# Roles and permissions

PolyWall defines three roles. CASL authorization is enforced on the server and never relies solely on whether a button is visible.

| Capability | Platform administrator | Organization administrator | Content manager |
|---|:---:|:---:|:---:|
| Manage organizations | ✓ | — | — |
| Switch active organization | ✓ | — | — |
| Manage organization administrators | ✓ | — | — |
| Update the current organization | ✓ | ✓ | — |
| Manage content users | ✓ | ✓ | — |
| Manage media and playlists | ✓ | ✓ | ✓ |
| Manage schedules | ✓ | ✓ | ✓ |
| View channels and screens | ✓ | ✓ | ✓ |
| Update channels and screens | ✓ | ✓ | — |
| Create organization templates | ✓ | ✓ | — |
| View available templates | ✓ | ✓ | ✓ |
| Create global templates | ✓ | — | — |

## Platform administrator

Manages the entire platform and selects the active organization. Without an active organization, organization-owned content is unavailable.

## Organization administrator

Manages accounts, screens, channels, local templates, media, playlists, and schedules for one organization. Global templates are read-only.

## Content manager

Creates and schedules content while viewing the channels, screens, and templates needed for that work. This role cannot modify display infrastructure or accounts.

<!-- @formatter:off -->
!!! security "Least privilege"
    Assign Content manager by default, reserve organization administration for people responsible for screens and accounts, and keep the number of platform administrators very small.
<!-- @formatter:on -->
