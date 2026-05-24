import { describe, expect, it } from 'vitest';

import {
    buildRenderedCarouselItems,
    getMiddleRenderedIndex,
    getTargetRenderedIndex,
    isCarouselWindowIndex,
    shouldRepeatCarouselItems,
    SHORT_PLAYLIST_REPEAT_COUNT,
} from '@/components/screens/display-playlist-carousel-model';
import { type DisplaySequenceItem } from '@/lib/display-runtime/types';

const items = Array.from({length: 4}, (_, index) => ({
    id: `item-${index}`,
    asset: {cacheKey: `asset-${index}`},
})) as DisplaySequenceItem[];

describe('display-playlist-carousel-model', () => {
    it('repeats only short playlists that need synthetic loop content', () => {
        expect(shouldRepeatCarouselItems(1)).toBe(false);
        expect(shouldRepeatCarouselItems(2)).toBe(true);
        expect(shouldRepeatCarouselItems(4)).toBe(true);
        expect(shouldRepeatCarouselItems(5)).toBe(false);
    });

    it('builds repeated rendered items with stable rendered indexes', () => {
        const renderedItems = buildRenderedCarouselItems(items.slice(0, 2), SHORT_PLAYLIST_REPEAT_COUNT);

        expect(renderedItems).toHaveLength(10);
        expect(renderedItems[0]).toMatchObject({originalIndex: 0, renderedIndex: 0});
        expect(renderedItems[3]).toMatchObject({originalIndex: 1, renderedIndex: 3});
    });

    it('starts repeated playlists on the middle copy', () => {
        const renderedItems = buildRenderedCarouselItems(items.slice(0, 2), SHORT_PLAYLIST_REPEAT_COUNT);

        expect(getTargetRenderedIndex({
            originalIndex: 1,
            previousOriginalIndex: null,
            previousRenderedIndex: null,
            renderedItems,
            sourceItemsCount: 2,
        })).toBe(getMiddleRenderedIndex(1, 2));
    });

    it('continues forward across the last to first item boundary', () => {
        const renderedItems = buildRenderedCarouselItems(items, SHORT_PLAYLIST_REPEAT_COUNT);

        expect(getTargetRenderedIndex({
            originalIndex: 0,
            previousOriginalIndex: 3,
            previousRenderedIndex: 11,
            renderedItems,
            sourceItemsCount: 4,
        })).toBe(12);
    });

    it('wraps to the first rendered copy when the synthetic list reaches its end', () => {
        const renderedItems = buildRenderedCarouselItems(items, SHORT_PLAYLIST_REPEAT_COUNT);

        expect(getTargetRenderedIndex({
            originalIndex: 0,
            previousOriginalIndex: 3,
            previousRenderedIndex: 19,
            renderedItems,
            sourceItemsCount: 4,
        })).toBe(0);
    });

    it('keeps only previous, current and next source indexes loaded for long playlists', () => {
        expect(isCarouselWindowIndex(1, 2, 5)).toBe(true);
        expect(isCarouselWindowIndex(2, 2, 5)).toBe(true);
        expect(isCarouselWindowIndex(3, 2, 5)).toBe(true);
        expect(isCarouselWindowIndex(4, 2, 5)).toBe(false);
    });
});
