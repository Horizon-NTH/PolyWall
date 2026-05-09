import { AbilityBuilder, PureAbility, type ForcedSubject } from '@casl/ability';
import { createPrismaAbility, PrismaQuery } from '@casl/prisma';
import { Prisma } from '@/generated/prisma/client';
import { UserRole } from '@/generated/prisma/enums';

export type AppAction =
    | 'manage'
    | 'create'
    | 'read'
    | 'update'
    | 'delete'
    | 'switch'
    | 'view';

export type AppSubject =
    | Prisma.ModelName
    | 'all'
    | 'SuperAdminSection'
    | 'OrganizationAdminSection';

export type AppAbility = PureAbility<
    [AppAction, AppSubject | ForcedSubject<AppSubject>],
    PrismaQuery
>;

type AbilityUser = {
    role: UserRole;
    organizationId: string | null;
};

const CRUD_ACTIONS: AppAction[] = ['create', 'read', 'update', 'delete'];

export function defineAbilityFor(user: AbilityUser): AppAbility {
    const {can, build} = new AbilityBuilder<AppAbility>(createPrismaAbility);
    const allowCrud = (subject: AppSubject, condition?: PrismaQuery) => {
        can(CRUD_ACTIONS, subject, condition);
    };
    const allowRead = (subject: AppSubject, condition?: PrismaQuery) => {
        can('read', subject, condition);
    };
    const applyContentManagerRules = (organizationId: string) => {
        allowCrud('MediaItem', {organizationId});
        allowCrud('MediaFile', {mediaItem: {organizationId}});

        allowCrud('Playlist', {organizationId});
        allowCrud('PlaylistItem', {playlist: {organizationId}});

        allowCrud('PlaylistSchedule', {channel: {organizationId}});
        allowCrud('ScheduleTimeSlot', {playlistSchedule: {channel: {organizationId}}});

        allowRead('Channel', {organizationId});
        allowRead('Screen', {organizationId});

        allowRead('DisplayTemplate', {organizationId: null});
        allowRead('DisplayTemplate', {organizationId});
        allowRead('DisplayZone', {displayTemplate: {organizationId: null}});
        allowRead('DisplayZone', {displayTemplate: {organizationId}});

        allowRead('WidgetType');
        allowRead('WidgetInstance', {displayZone: {template: {organizationId: null}}});
        allowRead('WidgetInstance', {displayZone: {template: {organizationId}}});
    };

    if (user.role === UserRole.PLATFORM_SUPER_ADMIN) {
        can('manage', 'all');
        can('view', 'SuperAdminSection');
        can('switch', 'Organization');
        return build();
    }

    if (!user.organizationId) {
        return build();
    }

    const organizationId = user.organizationId;

    allowRead('Organization', {id: organizationId});

    if (user.role === UserRole.ORGANIZATION_ADMIN) {
        can('view', 'OrganizationAdminSection');

        applyContentManagerRules(organizationId);

        allowCrud('User', {organizationId});
        allowCrud('Screen', {organizationId});
        allowCrud('Channel', {organizationId});

        can(['read', 'update'], 'Organization', {id: organizationId});

        allowRead('DisplayTemplate', {organizationId: null});
        allowCrud('DisplayTemplate', {organizationId});

        allowRead('DisplayZone', {displayTemplate: {organizationId: null}});
        allowCrud('DisplayZone', {displayTemplate: {organizationId}});

        allowRead('WidgetInstance', {displayZone: {template: {organizationId: null}}});
        allowCrud('WidgetInstance', {displayZone: {template: {organizationId}}});

        return build();
    }

    if (user.role === UserRole.CONTENT_MANAGER) {
        applyContentManagerRules(organizationId);

        return build();
    }

    return build();
}
