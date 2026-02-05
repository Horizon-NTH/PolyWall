import { describe, expect, it } from 'vitest';
import { subject } from '@casl/ability';

import { defineAbilityFor } from '@/lib/casl/ability';
import { UserRole } from '@/generated/prisma/enums';

describe('defineAbilityFor', () => {
    const orgId = 'org-1';
    const otherOrgId = 'org-2';
    const expectDisplayTemplateAccess = (ability: ReturnType<typeof defineAbilityFor>) => {
        expect(
            ability.can('read', subject('DisplayTemplate', {organizationId: null})),
        ).toBe(true);
        expect(
            ability.can('read', subject('DisplayTemplate', {organizationId: orgId})),
        ).toBe(true);
        expect(
            ability.can('read', subject('DisplayTemplate', {organizationId: otherOrgId})),
        ).toBe(false);
    };
    const expectRuleWithConditions = (
        ability: ReturnType<typeof defineAbilityFor>,
        action: Parameters<typeof ability.rulesFor>[0],
        subjectName: Parameters<typeof ability.rulesFor>[1],
        conditions: Record<string, unknown>,
    ) => {
        expect(ability.rulesFor(action, subjectName)).toEqual(
            expect.arrayContaining([expect.objectContaining({conditions})]),
        );
    };
    const expectNoRuleWithConditions = (
        ability: ReturnType<typeof defineAbilityFor>,
        action: Parameters<typeof ability.rulesFor>[0],
        subjectName: Parameters<typeof ability.rulesFor>[1],
        conditions: Record<string, unknown>,
    ) => {
        expect(ability.rulesFor(action, subjectName)).not.toEqual(
            expect.arrayContaining([expect.objectContaining({conditions})]),
        );
    };

    it('grants full access to platform super admins', () => {
        const ability = defineAbilityFor({
            role: UserRole.PLATFORM_SUPER_ADMIN,
            organizationId: null,
        });

        expect(ability.can('manage', 'all')).toBe(true);
        expect(ability.can('view', 'SuperAdminSection')).toBe(true);
        expect(ability.can('switch', 'Organization')).toBe(true);
    });

    it('returns no org-scoped permissions without organizationId', () => {
        const ability = defineAbilityFor({
            role: UserRole.ORGANIZATION_ADMIN,
            organizationId: null,
        });

        expect(ability.can('read', subject('Organization', {id: orgId}))).toBe(false);
        expect(ability.can('view', 'OrganizationAdminSection')).toBe(false);
    });

    it('applies organization admin permissions', () => {
        const ability = defineAbilityFor({
            role: UserRole.ORGANIZATION_ADMIN,
            organizationId: orgId,
        });

        expect(ability.can('view', 'OrganizationAdminSection')).toBe(true);
        expect(ability.can('view', 'SuperAdminSection')).toBe(false);
        expect(ability.can('switch', 'Organization')).toBe(false);

        expect(ability.can('read', subject('Organization', {id: orgId}))).toBe(true);
        expect(ability.can('read', subject('Organization', {id: otherOrgId}))).toBe(false);
        expect(ability.can('update', subject('Organization', {id: orgId}))).toBe(true);
        expect(ability.can('update', subject('Organization', {id: otherOrgId}))).toBe(false);

        expect(ability.can('create', subject('User', {organizationId: orgId}))).toBe(true);
        expect(ability.can('create', subject('User', {organizationId: otherOrgId}))).toBe(false);

        expect(ability.can('delete', subject('Channel', {organizationId: orgId}))).toBe(true);
        expect(ability.can('delete', subject('Channel', {organizationId: otherOrgId}))).toBe(false);

        expectDisplayTemplateAccess(ability);
        expect(
            ability.can('create', subject('DisplayTemplate', {organizationId: orgId})),
        ).toBe(true);
        expect(
            ability.can('create', subject('DisplayTemplate', {organizationId: null})),
        ).toBe(false);

        expectRuleWithConditions(ability, 'create', 'DisplayZone', {
            displayTemplate: {organizationId: orgId},
        });
        expectNoRuleWithConditions(ability, 'create', 'DisplayZone', {
            displayTemplate: {organizationId: null},
        });

        expect(ability.can('read', 'WidgetType')).toBe(true);
        expect(ability.can('create', 'WidgetType')).toBe(false);
    });

    it('applies content manager permissions', () => {
        const ability = defineAbilityFor({
            role: UserRole.CONTENT_MANAGER,
            organizationId: orgId,
        });

        expect(ability.can('view', 'OrganizationAdminSection')).toBe(false);
        expect(ability.can('view', 'SuperAdminSection')).toBe(false);
        expect(ability.can('switch', 'Organization')).toBe(false);

        expect(
            ability.can('create', subject('Playlist', {organizationId: orgId})),
        ).toBe(true);
        expect(
            ability.can('create', subject('Playlist', {organizationId: otherOrgId})),
        ).toBe(false);

        expect(ability.can('read', subject('Channel', {organizationId: orgId}))).toBe(true);
        expect(ability.can('update', subject('Channel', {organizationId: orgId}))).toBe(
            false,
        );

        expectDisplayTemplateAccess(ability);

        expectRuleWithConditions(ability, 'read', 'DisplayZone', {
            displayTemplate: {organizationId: null},
        });
        expectNoRuleWithConditions(ability, 'read', 'DisplayZone', {
            displayTemplate: {organizationId: otherOrgId},
        });

        expectRuleWithConditions(ability, 'create', 'MediaFile', {
            mediaItem: {organizationId: orgId},
        });
        expectNoRuleWithConditions(ability, 'create', 'MediaFile', {
            mediaItem: {organizationId: otherOrgId},
        });

        expectRuleWithConditions(ability, 'create', 'ScheduleTimeSlot', {
            playlistSchedule: {channel: {organizationId: orgId}},
        });
        expectNoRuleWithConditions(ability, 'create', 'ScheduleTimeSlot', {
            playlistSchedule: {channel: {organizationId: otherOrgId}},
        });

        expect(ability.can('read', 'WidgetType')).toBe(true);
        expect(ability.can('create', 'WidgetType')).toBe(false);
    });
});
