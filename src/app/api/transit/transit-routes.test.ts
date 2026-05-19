import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    searchTransitProviders: vi.fn(),
    getTransitProviderIndex: vi.fn(),
    logger: {
        success: vi.fn(),
        invalid: vi.fn(),
        denied: vi.fn(),
        error: vi.fn(),
    },
    createActionLogger: vi.fn(),
}));

vi.mock('@/actions/action-logging', () => ({
    createActionLogger: mocks.createActionLogger,
}));

vi.mock('@/auth', () => ({
    auth: mocks.auth,
}));

vi.mock('@/lib/transit/transit-index', () => ({
    searchTransitProviders: mocks.searchTransitProviders,
    getTransitProviderIndex: mocks.getTransitProviderIndex,
}));

describe('transit admin API routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.createActionLogger.mockReturnValue(mocks.logger);
        mocks.auth.mockResolvedValue({
            user: {
                id: 'user-1',
                organizationId: 'org-1',
                role: 'ORGANIZATION_ADMIN',
            },
        });
    });

    it('GET /api/transit/providers returns provider options for authenticated users', async () => {
        mocks.searchTransitProviders.mockResolvedValueOnce([
            {id: 'pan:network-1', label: 'Réseau 1'},
        ]);

        const mod = await import('@/app/api/transit/providers/route');
        const response = await mod.GET(new Request('http://localhost/api/transit/providers?q=reseau'));

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            providers: [{id: 'pan:network-1', label: 'Réseau 1'}],
        });
        expect(mocks.searchTransitProviders).toHaveBeenCalledWith('reseau');
        expect(mocks.logger.success).toHaveBeenCalledWith(expect.objectContaining({
            actorUserId: 'user-1',
            organizationId: 'org-1',
            query: 'reseau',
            resultCount: 1,
        }));
    });

    it('GET /api/transit/index returns the indexed provider data', async () => {
        mocks.getTransitProviderIndex.mockResolvedValueOnce({
            provider: {id: 'pan:network-1', label: 'Réseau 1'},
            stops: [],
            routes: [],
            destinations: [],
        });

        const mod = await import('@/app/api/transit/index/route');
        const response = await mod.GET(
            new Request('http://localhost/api/transit/index?providerId=pan:network-1'),
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({
            provider: {id: 'pan:network-1', label: 'Réseau 1'},
        });
        expect(mocks.getTransitProviderIndex).toHaveBeenCalledWith({
            providerId: 'pan:network-1',
        });
        expect(mocks.logger.success).toHaveBeenCalledWith(expect.objectContaining({
            actorUserId: 'user-1',
            organizationId: 'org-1',
            providerId: 'pan:network-1',
            stopCount: 0,
            routeCount: 0,
            destinationCount: 0,
        }));
    });

    it('rejects anonymous users', async () => {
        mocks.auth.mockResolvedValueOnce(null);

        const mod = await import('@/app/api/transit/providers/route');
        const response = await mod.GET(new Request('http://localhost/api/transit/providers'));

        expect(response.status).toBe(401);
        expect(mocks.logger.denied).toHaveBeenCalledWith({reason: 'not_authenticated'});
    });
});
