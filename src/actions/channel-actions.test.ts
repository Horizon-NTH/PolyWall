import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildSession, getAuthMocks, mockAuthModule, resetAuthMocks } from '@/test/mocks/auth';
import { getCaslMocks, mockCaslModule, resetCaslMocks } from '@/test/mocks/casl';
import { getPrismaMock, mockPrismaModule, resetPrismaMock } from '@/test/mocks/prisma';

mockAuthModule();
mockCaslModule();
mockPrismaModule();

describe('channel-actions', () => {
    beforeEach(async () => {
        await resetAuthMocks();
        await resetCaslMocks();
        const prisma = await resetPrismaMock();
        prisma.$transaction.mockResolvedValue([]);
    });

    it('rejects unauthenticated create', async () => {
        const {auth} = await getAuthMocks();
        auth.mockResolvedValueOnce(null);

        const {createChannel} = await import('@/actions/channel-actions');
        const result = await createChannel({
            name: 'Hall principal',
            description: 'Canal principal',
            displayTemplateId: 'template-1',
        });

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Vous devez être connecté.',
        });
    });

    it('rejects create when user has no organization', async () => {
        const {auth} = await getAuthMocks();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: null}}));

        const {createChannel} = await import('@/actions/channel-actions');
        const result = await createChannel({
            name: 'Hall principal',
            description: 'Canal principal',
            displayTemplateId: 'template-1',
        });

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Aucune organisation sélectionnée.',
        });
    });

    it('rejects create without permission', async () => {
        const {auth} = await getAuthMocks();
        const {defineAbilityFor} = await getCaslMocks();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));
        defineAbilityFor.mockReturnValueOnce({can: vi.fn(() => false)});

        const {createChannel} = await import('@/actions/channel-actions');
        const result = await createChannel({
            name: 'Hall principal',
            description: 'Canal principal',
            displayTemplateId: 'template-1',
        });

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Accès refusé.',
        });
    });

    it('creates a channel', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));
        prisma.displayTemplate.findFirst.mockResolvedValueOnce({id: 'template-1'});
        prisma.channel.create.mockResolvedValueOnce({id: 'channel-1'});

        const {createChannel} = await import('@/actions/channel-actions');
        const result = await createChannel({
            name: 'Hall principal',
            description: 'Canal principal',
            displayTemplateId: 'template-1',
        });

        expect(result).toEqual({ok: true, channelId: 'channel-1'});
        expect(prisma.channel.create).toHaveBeenCalledWith({
            data: {
                name: 'Hall principal',
                description: 'Canal principal',
                organizationId: 'org-1',
                displayTemplateId: 'template-1',
            },
            select: {id: true},
        });
    });

    it('rejects duplicate channel name on create', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));
        prisma.displayTemplate.findFirst.mockResolvedValueOnce({id: 'template-1'});
        prisma.channel.create.mockRejectedValueOnce({code: 'P2002'});

        const {createChannel} = await import('@/actions/channel-actions');
        const result = await createChannel({
            name: 'Hall principal',
            description: 'Canal principal',
            displayTemplateId: 'template-1',
        });

        expect(result).toEqual({
            ok: false,
            field: 'name',
            message: 'Un canal avec ce nom existe déjà.',
        });
    });

    it('rejects update when channel does not belong to current organization', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));
        prisma.channel.findFirst.mockResolvedValueOnce(null);

        const {updateChannel} = await import('@/actions/channel-actions');
        const result = await updateChannel('channel-1', {
            name: 'Cafétéria',
            description: 'Canal cafétéria',
            displayTemplateId: 'template-1',
        });

        expect(result).toEqual({
            ok: false,
            field: 'root',
            message: 'Canal introuvable.',
        });
    });

    it('deletes a channel without screens', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));
        prisma.channel.findFirst.mockResolvedValueOnce({
            id: 'channel-1',
            organizationId: 'org-1',
            _count: {screens: 0},
        });
        prisma.channel.delete.mockResolvedValueOnce({id: 'channel-1'});

        const {deleteChannel} = await import('@/actions/channel-actions');
        const result = await deleteChannel('channel-1');

        expect(result).toEqual({ok: true, channelId: 'channel-1'});
        expect(prisma.channel.delete).toHaveBeenCalledWith({
            where: {id: 'channel-1'},
            select: {id: true},
        });
    });

    it('rejects delete with screens when reassign target is missing', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));
        prisma.channel.findFirst.mockResolvedValueOnce({
            id: 'channel-1',
            organizationId: 'org-1',
            _count: {screens: 2},
        });

        const {deleteChannel} = await import('@/actions/channel-actions');
        const result = await deleteChannel('channel-1');

        expect(result).toEqual({
            ok: false,
            field: 'reassignToChannelId',
            message: 'Sélectionnez un canal de réaffectation pour les écrans.',
        });
    });

    it('rejects delete with same source and target channel', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));
        prisma.channel.findFirst.mockResolvedValueOnce({
            id: 'channel-1',
            organizationId: 'org-1',
            _count: {screens: 1},
        });

        const {deleteChannel} = await import('@/actions/channel-actions');
        const result = await deleteChannel('channel-1', {reassignToChannelId: 'channel-1'});

        expect(result).toEqual({
            ok: false,
            field: 'reassignToChannelId',
            message: 'Le canal de réaffectation doit être différent.',
        });
    });

    it('rejects delete with reassign target outside organization', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));
        prisma.channel.findFirst
            .mockResolvedValueOnce({
                id: 'channel-1',
                organizationId: 'org-1',
                _count: {screens: 1},
            })
            .mockResolvedValueOnce(null);

        const {deleteChannel} = await import('@/actions/channel-actions');
        const result = await deleteChannel('channel-1', {reassignToChannelId: 'channel-2'});

        expect(result).toEqual({
            ok: false,
            field: 'reassignToChannelId',
            message: 'Canal de réaffectation introuvable.',
        });
    });

    it('deletes a channel and reassigns screens to target channel', async () => {
        const {auth} = await getAuthMocks();
        const prisma = await getPrismaMock();
        auth.mockResolvedValueOnce(buildSession({user: {organizationId: 'org-1'}}));
        prisma.channel.findFirst
            .mockResolvedValueOnce({
                id: 'channel-1',
                organizationId: 'org-1',
                _count: {screens: 2},
            })
            .mockResolvedValueOnce({
                id: 'channel-2',
                organizationId: 'org-1',
                _count: {screens: 0},
            });
        prisma.screen.updateMany.mockResolvedValueOnce({count: 2});
        prisma.channel.delete.mockResolvedValueOnce({id: 'channel-1'});

        const {deleteChannel} = await import('@/actions/channel-actions');
        const result = await deleteChannel('channel-1', {reassignToChannelId: 'channel-2'});

        expect(result).toEqual({ok: true, channelId: 'channel-1'});
        expect(prisma.screen.updateMany).toHaveBeenCalledWith({
            where: {channelId: 'channel-1'},
            data: {channelId: 'channel-2'},
        });
        expect(prisma.channel.delete).toHaveBeenCalledWith({
            where: {id: 'channel-1'},
            select: {id: true},
        });
        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
});
