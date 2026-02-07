import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { MediaForm } from '@/components/media/media-form';

const pushMock = vi.fn();
const updateMediaItemMock = vi.fn();
const deleteMediaItemMock = vi.fn();
const uploadMediaWithIntentMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: pushMock,
        refresh: vi.fn(),
    }),
}));

vi.mock('next/link', () => ({
    __esModule: true,
    default: (props: React.ComponentProps<'a'>) => <a {...props} />,
}));

vi.mock('@/actions/media-actions', () => ({
    updateMediaItem: (...args: unknown[]) => updateMediaItemMock(...args),
    deleteMediaItem: (...args: unknown[]) => deleteMediaItemMock(...args),
}));

vi.mock('@/lib/media/media-upload-client', () => ({
    uploadMediaWithIntent: (...args: unknown[]) => uploadMediaWithIntentMock(...args),
    isUploadMediaError: (error: unknown) => Boolean(error && typeof error === 'object' && 'stage' in (error as Record<string, unknown>)),
}));

vi.mock('sonner', () => ({
    toast: {
        success: (...args: unknown[]) => toastSuccessMock(...args),
        error: (...args: unknown[]) => toastErrorMock(...args),
    },
}));

describe('MediaForm', () => {
    beforeEach(() => {
        pushMock.mockReset();
        updateMediaItemMock.mockReset();
        uploadMediaWithIntentMock.mockReset();
        deleteMediaItemMock.mockReset();
        toastSuccessMock.mockReset();
        toastErrorMock.mockReset();
    });

    it('creates a media and redirects on success', async () => {
        uploadMediaWithIntentMock.mockResolvedValueOnce({mediaItemId: 'media-1'});

        render(
            <MediaForm
                mode="create"
                organizationId="org-1"
                cancelHref="/dashboard/media"
            />,
        );

        fireEvent.change(screen.getByLabelText('Titre'), {target: {value: 'Affiche'}});
        fireEvent.change(screen.getByLabelText('Description'), {target: {value: 'Description média'}});
        fireEvent.change(screen.getByLabelText('Durée (secondes)'), {target: {value: '12'}});
        fireEvent.change(screen.getByLabelText('Fichier média'), {
            target: {
                files: [new File(['demo'], 'affiche.png', {type: 'image/png'})],
            },
        });

        fireEvent.click(screen.getByRole('button', {name: 'Créer'}));

        await waitFor(() => {
            expect(uploadMediaWithIntentMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Affiche',
                    description: 'Description média',
                    durationSeconds: 12,
                    organizationId: 'org-1',
                }),
            );
            expect(toastSuccessMock).toHaveBeenCalledWith('Média créé.');
            expect(pushMock).toHaveBeenCalledWith('/dashboard/media/media-1');
        });
    });

    it('updates media metadata and redirects on success', async () => {
        updateMediaItemMock.mockResolvedValueOnce({ok: true, mediaItemId: 'media-2'});

        render(
            <MediaForm
                mode="edit"
                mediaItemId="media-2"
                cancelHref="/dashboard/media/media-2"
                defaultValues={{
                    title: 'Ancien',
                    description: 'Ancienne description',
                    durationSeconds: 15,
                    active: true,
                }}
            />,
        );

        fireEvent.change(screen.getByLabelText('Titre'), {target: {value: 'Nouveau'}});
        fireEvent.click(screen.getByRole('button', {name: 'Enregistrer'}));

        await waitFor(() => {
            expect(updateMediaItemMock).toHaveBeenCalledWith('media-2', {
                title: 'Nouveau',
                description: 'Ancienne description',
                durationSeconds: 15,
                active: true,
            });
            expect(toastSuccessMock).toHaveBeenCalledWith('Média mis à jour.');
            expect(pushMock).toHaveBeenCalledWith('/dashboard/media/media-2');
        });
    });

    it('rolls back created media if upload fails after intent', async () => {
        uploadMediaWithIntentMock.mockRejectedValueOnce({
            stage: 'complete',
            mediaItemId: 'media-rollback',
            message: 'Objet non trouvé dans le stockage.',
        });
        deleteMediaItemMock.mockResolvedValueOnce({ok: true});

        render(
            <MediaForm
                mode="create"
                organizationId="org-1"
                cancelHref="/dashboard/media"
            />,
        );

        fireEvent.change(screen.getByLabelText('Titre'), {target: {value: 'Affiche'}});
        fireEvent.change(screen.getByLabelText('Description'), {target: {value: 'Description média'}});
        fireEvent.change(screen.getByLabelText('Durée (secondes)'), {target: {value: '12'}});
        fireEvent.change(screen.getByLabelText('Fichier média'), {
            target: {
                files: [new File(['demo'], 'affiche.png', {type: 'image/png'})],
            },
        });
        fireEvent.click(screen.getByRole('button', {name: 'Créer'}));

        await waitFor(() => {
            expect(deleteMediaItemMock).toHaveBeenCalledWith('media-rollback');
        });
        expect(pushMock).not.toHaveBeenCalled();
    });
});
