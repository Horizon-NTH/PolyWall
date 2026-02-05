import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildSession, getAuthMocks, mockAuthModule } from '@/test/mocks/auth';
import { getPrismaMock, mockPrismaModule } from '@/test/mocks/prisma';
import { getCaslMocks, mockCaslModule } from '@/test/mocks/casl';
import { UserRole } from '@/generated/prisma/enums';

vi.mock('@/components/sidebar/app-sidebar-client', () => ({
    AppSidebarClient: (props: Record<string, unknown>) => (
        <div data-testid="app-sidebar-client" {...props} />
    ),
}));

mockAuthModule();
mockPrismaModule();
mockCaslModule();

describe('AppSidebar (server)', () => {
    beforeEach(async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        const {defineAbilityFor} = await getCaslMocks();

        auth.mockReset();
        prisma.organization.findMany.mockReset();
        defineAbilityFor.mockReset();
    });

    it('returns null when unauthenticated', async () => {
        const {auth} = await getAuthMocks();
        auth.mockResolvedValueOnce(null);
        const {AppSidebar} = await import('@/components/sidebar/app-sidebar');

        const result = await AppSidebar();

        expect(result).toBeNull();
    });

    it('loads all organizations ordered by name for platform super admins', async () => {
        const {auth} = await getAuthMocks();
        auth.mockResolvedValueOnce(
            buildSession({
                user: {role: UserRole.PLATFORM_SUPER_ADMIN, organizationId: null},
            }),
        );
        const {defineAbilityFor} = await getCaslMocks();
        defineAbilityFor.mockReturnValue({can: vi.fn(() => true)});
        const prisma = await getPrismaMock();
        prisma.organization.findMany.mockResolvedValueOnce([
            {id: 'org-1', name: 'A'},
            {id: 'org-2', name: 'B'},
        ]);
        const {AppSidebar} = await import('@/components/sidebar/app-sidebar');

        const result = await AppSidebar();

        expect(prisma.organization.findMany).toHaveBeenCalledWith({
            select: {id: true, name: true},
            orderBy: {name: 'asc'},
        });
        expect(result?.props).toMatchObject({
            organizations: [
                {id: 'org-1', name: 'A'},
                {id: 'org-2', name: 'B'},
            ],
            currentOrganizationId: null,
            userRole: UserRole.PLATFORM_SUPER_ADMIN,
        });
    });

    it.each([
        ['organization admin', UserRole.ORGANIZATION_ADMIN],
        ['content manager', UserRole.CONTENT_MANAGER],
    ])('loads only the current organization for non-switchable roles (%s)', async (_label, role) => {
        const {orgId, orgs} = {orgId: 'org-2', orgs: 'Org Two'};
        const {auth} = await getAuthMocks();
        auth.mockResolvedValueOnce(
            buildSession({
                user: {role, organizationId: orgId},
            }),
        );

        const {defineAbilityFor} = await getCaslMocks();
        defineAbilityFor.mockReturnValue({can: vi.fn(() => false)});

        const prisma = await getPrismaMock();
        prisma.organization.findMany.mockResolvedValueOnce(orgs);

        const {AppSidebar} = await import('@/components/sidebar/app-sidebar');

        const result = await AppSidebar();

        expect(prisma.organization.findMany).toHaveBeenCalledWith({
            where: {id: orgId},
            select: {id: true, name: true},
        });

        expect(result?.props).toMatchObject({
            organizations: orgs,
            currentOrganizationId: orgId,
            userRole: role,
        });
    });
});
