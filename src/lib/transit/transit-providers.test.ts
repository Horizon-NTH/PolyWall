import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { resolveTransitProvider } from '@/lib/transit/transit-providers';

describe('transit providers', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            if (url.endsWith('/custom-network')) {
                return Response.json({
                    id: 'custom-network',
                    title: 'Réseau test',
                    resources: [
                        {
                            format: 'GTFS',
                            title: 'Horaires théoriques',
                            url: 'https://example.test/custom.gtfs.zip',
                            is_available: true,
                        },
                        {
                            id: 'trip-updates-resource',
                            format: 'gtfs-rt',
                            title: 'Trip updates temps réel',
                            url: 'https://example.test/custom.trip-updates.pb',
                            is_available: true,
                        },
                    ],
                });
            }

            return Response.json({}, {status: 404});
        }));
    });

    it('resolves a custom PAN dataset from transport.data.gouv.fr resources', async () => {
        await expect(resolveTransitProvider('pan:custom-network')).resolves.toEqual({
            id: 'pan:custom-network',
            label: 'Réseau test',
            staticGtfsUrl: 'https://example.test/custom.gtfs.zip',
            tripUpdatesUrl: 'https://example.test/custom.trip-updates.pb',
        });
    });

    it('rejects providers without a PAN provider id', async () => {
        await expect(resolveTransitProvider('')).rejects.toThrow('PAN provider id is required');
        await expect(resolveTransitProvider('custom-network')).rejects.toThrow('PAN provider id is required');
    });
});
