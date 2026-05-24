import { beforeEach, describe, expect, it } from 'vitest';

import { buildSession, getAuthMocks, mockAuthModule, resetAuthMocks } from '@/test/mocks/auth';
import { mockCaslModule, resetCaslMocks } from '@/test/mocks/casl';
import { getPrismaMock, mockPrismaModule, resetPrismaMock } from '@/test/mocks/prisma';
import { UserRole, ZoneType } from '@/generated/prisma/enums';

mockAuthModule();
mockCaslModule();
mockPrismaModule();

const templatePayload = {
    scope: 'organization' as const,
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
        await resetAuthMocks();
        await resetCaslMocks();
        await resetPrismaMock();
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

    it('creates a global template for a platform super admin', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({
            user: {
                role: UserRole.PLATFORM_SUPER_ADMIN,
                organizationId: null,
            },
        }));
        prisma.displayTemplate.create.mockResolvedValueOnce({id: 'template-global'});

        const {createDisplayTemplate} = await import('@/actions/display-template-actions');
        const result = await createDisplayTemplate({...templatePayload, scope: 'global'});

        expect(result).toEqual({ok: true, templateId: 'template-global'});
        expect(prisma.displayTemplate.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                organizationId: null,
                templateKey: 'global:hall',
            }),
            select: {id: true},
        }));
    });

    it('rejects global template creation for organization admins', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));

        const {createDisplayTemplate} = await import('@/actions/display-template-actions');
        const result = await createDisplayTemplate({...templatePayload, scope: 'global'});

        expect(result).toEqual({
            ok: false,
            field: 'scope',
            message: 'Seul un super-admin peut créer un modèle global.',
        });
        expect(prisma.displayTemplate.create).not.toHaveBeenCalled();
    });

    it('rejects inaccessible static image media', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));
        prisma.mediaItem.count.mockResolvedValueOnce(0);

        const {createDisplayTemplate} = await import('@/actions/display-template-actions');
        const result = await createDisplayTemplate({
            ...templatePayload,
            zones: [
                templatePayload.zones[0],
                {
                    name: 'Logo',
                    zoneType: ZoneType.STATIC,
                    orderIndex: 1,
                    positionX: 0,
                    positionY: 0,
                    width: 320,
                    height: 180,
                    configurationJson: {
                        contentType: 'image',
                        mediaItemId: 'media-other-org',
                        fit: 'contain',
                    },
                    widgetInstance: null,
                },
            ],
        });

        expect(result).toEqual({
            ok: false,
            field: 'zones',
            message: 'Une image statique est introuvable ou inaccessible.',
        });
        expect(prisma.displayTemplate.create).not.toHaveBeenCalled();
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
