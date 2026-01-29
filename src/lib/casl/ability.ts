import { AbilityBuilder, PureAbility } from '@casl/ability';
import { createPrismaAbility, PrismaQuery } from '@casl/prisma';
import { Prisma } from '@/generated/prisma/client';
import { UserRole } from '@/generated/prisma/enums';

export type AppAction = 'manage' | 'create' | 'read' | 'update' | 'delete' | 'switch' | 'view';
export type AppSubject = Prisma.ModelName | 'all' | 'AdminSection';
export type AppAbility = PureAbility<[AppAction, AppSubject], PrismaQuery>;

type AbilityUser = {
    role: UserRole;
    organizationId: string | null;
};

export function defineAbilityFor(user: AbilityUser): AppAbility {
    const {can, build} = new AbilityBuilder<AppAbility>(createPrismaAbility);

    if (user.role === UserRole.PLATFORM_SUPER_ADMIN) {
        can('manage', 'all');
        can('switch', 'Organization');
        can('view', 'AdminSection');
        return build();
    }

    if (!user.organizationId) {
        return build();
    }

    const organizationId = user.organizationId;

    can('read', 'Organization', {id: organizationId});

    if (user.role === UserRole.ORGANIZATION_ADMIN) {
        can(['create', 'read', 'update', 'delete'], 'Playlist', {organizationId});
        can(['create', 'read', 'update', 'delete'], 'Channel', {organizationId});
        can(['create', 'read', 'update', 'delete'], 'Screen', {organizationId});
        can(['create', 'read', 'update', 'delete'], 'WidgetInstance', {organizationId});
        can(['create', 'read', 'update', 'delete'], 'DisplayTemplate', {organizationId});
        can(['read', 'update'], 'Organization', {id: organizationId});
        can(['create', 'read', 'update', 'delete'], 'User', {organizationId});
        return build();
    }

    if (user.role === UserRole.CONTENT_MANAGER) {
        can(['read'], 'Playlist', {organizationId});
        can(['read'], 'Channel', {organizationId});
        can(['read'], 'Screen', {organizationId});
        can(['read'], 'WidgetInstance', {organizationId});
        can(['read'], 'DisplayTemplate', {organizationId});
        can(['read'], 'Organization', {id: organizationId});
        return build();
    }

    return build();
}
