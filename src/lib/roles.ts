import { UserRole } from '@/generated/prisma/enums';

export const roleLabels: Record<UserRole, string> = {
    PLATFORM_SUPER_ADMIN: 'Super admin plateforme',
    ORGANIZATION_ADMIN: 'Admin organisation',
    CONTENT_MANAGER: 'Gestionnaire de contenu',
};

export function getRoleLabel(role: UserRole): string {
    return roleLabels[role];
}

export const adminRoleOptions = [
    {
        value: UserRole.PLATFORM_SUPER_ADMIN,
        label: roleLabels[UserRole.PLATFORM_SUPER_ADMIN],
    },
    {
        value: UserRole.ORGANIZATION_ADMIN,
        label: roleLabels[UserRole.ORGANIZATION_ADMIN],
    },
] as const;
