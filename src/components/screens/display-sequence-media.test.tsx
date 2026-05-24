import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DisplaySequenceMedia } from '@/components/screens/display-sequence-media';
import { type DisplaySequenceItem } from '@/lib/display-runtime/types';

function buildItem(overrides: Partial<DisplaySequenceItem> = {}): DisplaySequenceItem {
    return {
        id: 'item-1',
        playlistItemId: 'playlist-item-1',
        mediaItemId: 'media-1',
        mediaTitle: 'Affiche principale',
        mediaKind: 'image',
        durationSeconds: 30,
        orderIndex: 0,
        frameIndex: 0,
        asset: {
            assetId: 'asset-1',
            mediaFileId: 'asset-1',
            cacheKey: 'asset-1',
            signedUrl: 'https://example.com/image.png',
            expiresAt: '2026-05-02T11:00:00.000Z',
            mimeType: 'image/png',
            width: 1920,
            height: 1080,
        },
        ...overrides,
    };
}

describe('DisplaySequenceMedia', () => {
    it('renders a loading skeleton while the source is unavailable', () => {
        const {container} = render(
            <DisplaySequenceMedia
                item={buildItem()}
                src={null}
                playing={false}
                itemOffsetSeconds={0}
            />,
        );

        expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
    });

    it('renders image media with the resolved source and title', () => {
        render(
            <DisplaySequenceMedia
                item={buildItem()}
                src="blob:http://localhost/image"
                playing={false}
                itemOffsetSeconds={0}
                className="object-cover"
                style={{borderRadius: 24}}
            />,
        );

        expect(screen.getByAltText('Affiche principale')).toHaveAttribute('src', 'blob:http://localhost/image');
        expect(screen.getByAltText('Affiche principale')).toHaveClass('object-cover');
        expect(screen.getByAltText('Affiche principale')).toHaveStyle({borderRadius: '24px'});
    });

    it('pauses inactive videos instead of letting neighboring carousel videos play', () => {
        const pauseSpy = vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);

        render(
            <DisplaySequenceMedia
                item={buildItem({mediaKind: 'video'})}
                src="blob:http://localhost/video"
                playing={false}
                itemOffsetSeconds={12}
            />,
        );

        expect(pauseSpy).toHaveBeenCalledTimes(1);
        expect(document.querySelector('video')).toHaveAttribute('preload', 'auto');

        pauseSpy.mockRestore();
    });

    it('syncs active videos on mount and loaded metadata without resubscribing every offset tick', () => {
        const addEventListenerSpy = vi.spyOn(window.HTMLMediaElement.prototype, 'addEventListener');
        const removeEventListenerSpy = vi.spyOn(window.HTMLMediaElement.prototype, 'removeEventListener');

        const {rerender} = render(
            <DisplaySequenceMedia
                item={buildItem({mediaKind: 'video'})}
                src="blob:http://localhost/video"
                playing
                itemOffsetSeconds={5}
            />,
        );
        const video = document.querySelector('video');
        expect(video).not.toBeNull();
        expect(video?.currentTime).toBe(5);
        expect(addEventListenerSpy).toHaveBeenCalledWith('loadedmetadata', expect.any(Function));
        const initialLoadedMetadataListenerCount = addEventListenerSpy.mock.calls.filter(([eventName]) => eventName === 'loadedmetadata').length;

        rerender(
            <DisplaySequenceMedia
                item={buildItem({mediaKind: 'video'})}
                src="blob:http://localhost/video"
                playing
                itemOffsetSeconds={8}
            />,
        );
        const loadedMetadataListeners = addEventListenerSpy.mock.calls.filter(([eventName]) => eventName === 'loadedmetadata');
        expect(loadedMetadataListeners).toHaveLength(initialLoadedMetadataListenerCount);

        if (video) {
            video.currentTime = 5;
            fireEvent(video, new Event('loadedmetadata'));
            expect(video.currentTime).toBe(8);
        }

        addEventListenerSpy.mockRestore();
        removeEventListenerSpy.mockRestore();
    });
});
