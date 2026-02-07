import { afterEach, describe, expect, it, vi } from 'vitest';

import { isUploadMediaError, uploadMediaWithIntent } from '@/lib/media/media-upload-client';

function jsonResponse(body: unknown, init?: ResponseInit) {
    return new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: {'Content-Type': 'application/json'},
    });
}

describe('media-upload-client', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('uploads media end-to-end with intent + put + complete', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                jsonResponse({
                    mediaFileId: 'mf-1',
                    mediaItemId: 'mi-1',
                    storageBucket: 'bucket',
                    objectKey: 'org/o1/media/m1/original/file.png',
                    uploadUrl: 'https://upload.example.com/presigned',
                    expiresAt: '2026-02-07T10:00:00.000Z',
                }, {status: 201}),
            )
            .mockResolvedValueOnce(new Response(null, {status: 200}))
            .mockResolvedValueOnce(jsonResponse({ok: true}));

        vi.stubGlobal('fetch', fetchMock);

        const result = await uploadMediaWithIntent({
            file: new File(['demo'], 'file.png', {type: 'image/png'}),
            title: 'Affiche',
            description: 'Description',
            durationSeconds: 10,
            organizationId: 'org-1',
        });

        expect(result).toEqual({
            mediaItemId: 'mi-1',
            mediaFileId: 'mf-1',
            objectKey: 'org/o1/media/m1/original/file.png',
        });

        expect(fetchMock).toHaveBeenNthCalledWith(
            1,
            '/api/media/upload-intents',
            expect.objectContaining({method: 'POST'}),
        );
        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            'https://upload.example.com/presigned',
            expect.objectContaining({method: 'PUT'}),
        );
        expect(fetchMock).toHaveBeenNthCalledWith(
            3,
            '/api/media/upload-complete',
            expect.objectContaining({method: 'POST'}),
        );
    });

    it('throws UploadMediaError at intent stage', async () => {
        const fetchMock = vi.fn().mockResolvedValueOnce(
            jsonResponse({error: 'Type MIME non autorisé.'}, {status: 400}),
        );
        vi.stubGlobal('fetch', fetchMock);

        await expect(
            uploadMediaWithIntent({
                file: new File(['demo'], 'file.svg', {type: 'image/svg+xml'}),
                title: 'Logo',
                description: 'Description',
                durationSeconds: 10,
            }),
        ).rejects.toMatchObject({
            name: 'UploadMediaError',
            stage: 'intent',
            message: 'Type MIME non autorisé.',
        });
    });

    it('throws UploadMediaError at upload stage with media ids', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                jsonResponse({
                    mediaFileId: 'mf-1',
                    mediaItemId: 'mi-1',
                    storageBucket: 'bucket',
                    objectKey: 'org/o1/media/m1/original/file.png',
                    uploadUrl: 'https://upload.example.com/presigned',
                    expiresAt: '2026-02-07T10:00:00.000Z',
                }, {status: 201}),
            )
            .mockResolvedValueOnce(new Response(null, {status: 500}));
        vi.stubGlobal('fetch', fetchMock);

        await expect(
            uploadMediaWithIntent({
                file: new File(['demo'], 'file.png', {type: 'image/png'}),
                title: 'Affiche',
                description: 'Description',
                durationSeconds: 10,
            }),
        ).rejects.toMatchObject({
            name: 'UploadMediaError',
            stage: 'upload',
            mediaItemId: 'mi-1',
            mediaFileId: 'mf-1',
        });
    });

    it('throws UploadMediaError at complete stage and isUploadMediaError returns true', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                jsonResponse({
                    mediaFileId: 'mf-1',
                    mediaItemId: 'mi-1',
                    storageBucket: 'bucket',
                    objectKey: 'org/o1/media/m1/original/file.png',
                    uploadUrl: 'https://upload.example.com/presigned',
                    expiresAt: '2026-02-07T10:00:00.000Z',
                }, {status: 201}),
            )
            .mockResolvedValueOnce(new Response(null, {status: 200}))
            .mockResolvedValueOnce(jsonResponse({error: 'Validation de l\'upload impossible.'}, {status: 500}));
        vi.stubGlobal('fetch', fetchMock);

        try {
            await uploadMediaWithIntent({
                file: new File(['demo'], 'file.png', {type: 'image/png'}),
                title: 'Affiche',
                description: 'Description',
                durationSeconds: 10,
            });
        } catch (error) {
            expect(isUploadMediaError(error)).toBe(true);
            expect(error).toMatchObject({
                name: 'UploadMediaError',
                stage: 'complete',
                mediaItemId: 'mi-1',
                mediaFileId: 'mf-1',
            });
        }
    });
});
