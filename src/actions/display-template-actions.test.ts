import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildSession, getAuthMocks, mockAuthModule } from '@/test/mocks/auth';
import { getCaslMocks, mockCaslModule } from '@/test/mocks/casl';
import { getPrismaMock, mockPrismaModule } from '@/test/mocks/prisma';
import { ZoneType } from '@/generated/prisma/enums';

mockAuthModule();
mockCaslModule();
mockPrismaModule();

const templatePayload = {
    name: 'Hall',
    description: 'Template hall',
    resolutionX: 1920,
    resolutionY: 1080,
    configurationJson: {backgroundColor: '#000000'},
    zones: [{
        name: 'Main',
        zoneType: ZoneType.PLAYLIST,
        orderIndex: 0,
        positionX: 0,
        positionY: 0,
        width: 1920,
        height: 1080,
        configurationJson: {},
        widgetInstance: null,
    }],
};

describe('display-template-actions', () => {
    beforeEach(async () => {
        const {auth} = await getAuthMocks();
        const {defineAbilityFor} = await getCaslMocks();
        const prisma = await getPrismaMock();

        auth.mockReset();
        defineAbilityFor.mockReset();
        defineAbilityFor.mockReturnValue({can: vi.fn(() => true)});

        prisma.displayTemplate.findFirst.mockReset();
        prisma.displayTemplate.create.mockReset();
        prisma.displayTemplate.delete.mockReset();
        prisma.widgetType.findMany.mockReset();
    });

    it('creates an organization template', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));
        prisma.displayTemplate.create.mockResolvedValueOnce({id: 'template-1'});

        const {createDisplayTemplate} = await import('@/actions/display-template-actions');
        const result = await createDisplayTemplate(templatePayload);

        expect(result).toEqual({ok: true, templateId: 'template-1'});
        expect(prisma.displayTemplate.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                name: 'Hall',
                organizationId: 'org-1',
                templateKey: 'org:org-1:hall',
                zones: {
                    create: [expect.objectContaining({zoneType: ZoneType.PLAYLIST})],
                },
            }),
            select: {id: true},
        }));
    });

    it('rejects deleting a template used by channels', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));
        prisma.displayTemplate.findFirst.mockResolvedValueOnce({
            id: 'template-1',
            organizationId: 'org-1',
            _count: {channels: 1},
        });

        const {deleteDisplayTemplate} = await import('@/actions/display-template-actions');
        const result = await deleteDisplayTemplate('template-1');

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Impossible de supprimer un modèle utilisé par un canal.',
        });
        expect(prisma.displayTemplate.delete).not.toHaveBeenCalled();
    });
});
