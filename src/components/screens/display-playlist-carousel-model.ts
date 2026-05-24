import { type DisplaySequenceItem } from '@/lib/display-runtime/types';

export const SHORT_PLAYLIST_REPEAT_COUNT = 5;

export type RenderedCarouselItem = {
    item: DisplaySequenceItem;
    originalIndex: number;
    renderedIndex: number;
};

export function shouldRepeatCarouselItems(itemsCount: number) {
    return itemsCount > 1 && itemsCount <= 4;
}

export function buildRenderedCarouselItems(items: DisplaySequenceItem[], repeatCount: number): RenderedCarouselItem[] {
    return Array.from({length: repeatCount}).flatMap((_, repeatIndex) =>
        items.map((item, originalIndex) => ({
            item,
            originalIndex,
            renderedIndex: repeatIndex * items.length + originalIndex,
        })),
    );
}

export function getMiddleRenderedIndex(originalIndex: number, itemsCount: number) {
    return Math.floor(SHORT_PLAYLIST_REPEAT_COUNT / 2) * itemsCount + originalIndex;
}

export function getTargetRenderedIndex({
                                           originalIndex,
                                           previousOriginalIndex,
                                           previousRenderedIndex,
                                           renderedItems,
                                           sourceItemsCount,
                                       }: {
    originalIndex: number;
    previousOriginalIndex: number | null;
    previousRenderedIndex: number | null;
    renderedItems: Array<{ originalIndex: number; renderedIndex: number }>;
    sourceItemsCount: number;
}) {
    const candidates = renderedItems
        .filter((renderedItem) => renderedItem.originalIndex === originalIndex)
        .map((renderedItem) => renderedItem.renderedIndex);
    const renderedItemsCount = renderedItems.length;

    if (candidates.length === 0) return originalIndex;

    if (previousOriginalIndex === null || previousRenderedIndex === null) {
        return candidates.find((candidate) => candidate === getMiddleRenderedIndex(originalIndex, sourceItemsCount)) ?? candidates[0]!;
    }

    const nextOriginalIndex = (previousOriginalIndex + 1) % sourceItemsCount;
    const previousLoopOriginalIndex = (previousOriginalIndex - 1 + sourceItemsCount) % sourceItemsCount;
    const target = originalIndex === nextOriginalIndex
        ? previousRenderedIndex + 1
        : originalIndex === previousLoopOriginalIndex
            ? previousRenderedIndex - 1
            : previousRenderedIndex;

    if (target >= renderedItemsCount) {
        const loopedTarget = target % renderedItemsCount;
        return candidates.includes(loopedTarget) ? loopedTarget : candidates[candidates.length - 1]!;
    }

    if (target < 0) {
        const loopedTarget = ((target % renderedItemsCount) + renderedItemsCount) % renderedItemsCount;
        return candidates.includes(loopedTarget) ? loopedTarget : candidates[0]!;
    }

    return candidates.reduce((bestCandidate, candidate) =>
        Math.abs(candidate - target) < Math.abs(bestCandidate - target) ? candidate : bestCandidate,
    );
}

export function isCarouselWindowIndex(index: number, activeIndex: number, itemsCount: number) {
    if (activeIndex < 0) return false;
    if (itemsCount <= 3) return true;

    const previousIndex = ((activeIndex - 1) % itemsCount + itemsCount) % itemsCount;
    const nextIndex = (activeIndex + 1) % itemsCount;

    return index === previousIndex || index === activeIndex || index === nextIndex;
}
