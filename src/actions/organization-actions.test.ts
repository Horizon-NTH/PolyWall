import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildSession, getAuthMocks, mockAuthModule } from '@/test/mocks/auth';
import { getPrismaMock, mockPrismaModule } from '@/test/mocks/prisma';
import { getCaslMocks, mockCaslModule } from '@/test/mocks/casl';

mockAuthModule();
mockPrismaModule();
mockCaslModule();

describe('switchOrganization', () => {
    beforeEach(async () => {
        const { auth, unstable_update } = await getAuthMocks();
        const prisma = await getPrismaMock();
        const { defineAbilityFor } = await getCaslMocks();

        auth.mockReset();
        unstable_update.mockReset();
        prisma.organization.findUnique.mockReset();
        defineAbilityFor.mockReset();
    });

    it('rejects invalid organizationId', async () => {
        const { auth } = await getAuthMocks();
        const prisma = await getPrismaMock();
        const { defineAbilityFor } = await getCaslMocks();
        const { switchOrganization } = await import('@/actions/organization-actions');

        const result = await switchOrganization('');

        expect(result).toEqual({ ok: false });
        expect(auth).not.toHaveBeenCalled();
        expect(defineAbilityFor).not.toHaveBeenCalled();
        expect(prisma.organization.findUnique).not.toHaveBeenCalled();
    });

    it('rejects unauthenticated users', async () => {
        const { auth } = await getAuthMocks();
        auth.mockResolvedValueOnce(null);
        const { switchOrganization } = await import('@/actions/organization-actions');

        const result = await switchOrganization('org-1');

        expect(result).toEqual({ ok: false });
    });

    it('rejects when user cannot switch organizations', async () => {
        const { auth } = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession());
        const { defineAbilityFor } = await getCaslMocks();
        defineAbilityFor.mockReturnValue({ can: vi.fn(() => false) });
        const prisma = await getPrismaMock();
        const { switchOrganization } = await import('@/actions/organization-actions');

        const result = await switchOrganization('org-1');

        expect(result).toEqual({ ok: false });
        expect(prisma.organization.findUnique).not.toHaveBeenCalled();
    });

    it('rejects unknown organizations', async () => {
        const { auth } = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession());
        const { defineAbilityFor } = await getCaslMocks();
        defineAbilityFor.mockReturnValue({ can: vi.fn(() => true) });
        const prisma = await getPrismaMock();
        prisma.organization.findUnique.mockResolvedValueOnce(null);
        const { switchOrganization } = await import('@/actions/organization-actions');

        const result = await switchOrganization('missing-org');

        expect(result).toEqual({ ok: false });
        expect(prisma.organization.findUnique).toHaveBeenCalledWith({
            where: { id: 'missing-org' },
            select: { id: true },
        });
    });

    it('updates the session when switching organizations succeeds', async () => {
        const { auth, unstable_update } = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession());
        const { defineAbilityFor } = await getCaslMocks();
        defineAbilityFor.mockReturnValue({ can: vi.fn(() => true) });
        const prisma = await getPrismaMock();
        prisma.organization.findUnique.mockResolvedValueOnce({ id: 'org-2' });
        const { switchOrganization } = await import('@/actions/organization-actions');

        const result = await switchOrganization('org-2');

        expect(result).toEqual({ ok: true });
        expect(unstable_update).toHaveBeenCalledWith({
            user: { organizationId: 'org-2' },
        });
    });
});
