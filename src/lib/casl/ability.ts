import { AbilityBuilder, PureAbility } from '@casl/ability';
import { createPrismaAbility, PrismaQuery } from '@casl/prisma';
import { Prisma } from '@/generated/prisma/client';
import { UserRole } from '@/generated/prisma/enums';

export type AppAction = 'manage' | 'create' | 'read' | 'update' | 'delete' | 'switch';
export type AppSubject = Prisma.ModelName | 'all';
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
        return build();
    }

    if (!user.organizationId) {
        return build();
    }

    const organizationId = user.organizationId;

    can('read', 'Organization', {id: organizationId});

    if (user.role === UserRole.ORGANIZATION_ADMIN) {
        can('manage', 'all', {organizationId});
        can('update', 'Organization', {id: organizationId});
        return build();
    }

    if (user.role === UserRole.CONTENT_MANAGER) {
        can('read', 'all', {organizationId});
        return build();
    }

    return build();
}
