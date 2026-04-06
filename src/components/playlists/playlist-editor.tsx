'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
    type DragMoveEvent,
    type DragEndEvent,
    type DragOverEvent,
    type DragStartEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, GripVertical, Search, TriangleAlert, X } from 'lucide-react';
import { toast } from 'sonner';

import { replacePlaylistTimeline } from '@/actions/playlist-actions';
import { toggleMediaItemActive } from '@/actions/media-actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { cn, formatDurationSeconds } from '@/lib/utils';
import type { PlaylistTimelineReplaceValues } from '@/schemas/playlist-schema';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { MediaKindIcon } from '@/components/media/media-card';
import { useCurrentReturnTo } from '@/hooks/use-current-return-to';
import { appendReturnTo } from '@/lib/return-to';

type AvailableMediaItem = {
    id: string;
    title: string;
    description: string;
    durationSeconds: number;
    thumbUrl: string | null;
};

type TimelineMediaItem = {
    entryId: string;
    mediaItemId: string;
    title: string;
    description: string;
    durationSeconds: number;
    thumbUrl: string | null;
    active: boolean;
};

type PlaylistEditorProps = {
    playlistId: string;
    availableMedia: AvailableMediaItem[];
    initialTimeline: TimelineMediaItem[];
};

const TIMELINE_DROPZONE_ID = 'timeline-dropzone';
const LIBRARY_PREFIX = 'library:';
const TIMELINE_PREFIX = 'timeline:';
const MIN_MEDIA_LIBRARY_CARD_HEIGHT_PX = 420;

function makeLibraryId(mediaId: string) {
    return `${LIBRARY_PREFIX}${mediaId}`;
}

function makeTimelineId(entryId: string) {
    return `${TIMELINE_PREFIX}${entryId}`;
}

function parseTimelineId(value: string | number) {
    if (typeof value !== 'string' || !value.startsWith(TIMELINE_PREFIX)) return null;
    return value.slice(TIMELINE_PREFIX.length);
}

function createTimelineEntryId(mediaItemId: string) {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `${mediaItemId}-${crypto.randomUUID()}`;
    }
    return `${mediaItemId}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function pluralizeMedia(count: number) {
    return `${count} média${count > 1 ? 's' : ''}`;
}

function pluralizeInactive(count: number) {
    return `${count} inactif${count > 1 ? 's' : ''}`;
}

function buildTimelinePayloadKey(payload: PlaylistTimelineReplaceValues) {
    return payload.items.map((item) => item.mediaItemId).join('|');
}

function getDragPointerY(event: {
    active: {
        rect: {
            current: {
                translated?: { top: number; height: number } | null;
                initial: { top: number; height: number } | null
            }
        }
    }
}) {
    const translated = event.active.rect.current.translated;
    if (translated) return translated.top + translated.height / 2;

    const initial = event.active.rect.current.initial;
    if (initial) return initial.top + initial.height / 2;

    return null;
}

function getDragPointerPosition(event: {
    active: {
        rect: {
            current: {
                translated?: { top: number; left: number; width: number; height: number } | null;
                initial: { top: number; left: number; width: number; height: number } | null
            }
        }
    }
}) {
    const translated = event.active.rect.current.translated;
    if (translated) {
        return {
            x: translated.left + translated.width / 2,
            y: translated.top + translated.height / 2,
        };
    }

    const initial = event.active.rect.current.initial;
    if (initial) {
        return {
            x: initial.left + initial.width / 2,
            y: initial.top + initial.height / 2,
        };
    }

    return null;
}

function DraggableMediaCard({media}: { media: AvailableMediaItem }) {
    const {attributes, listeners, setNodeRef, isDragging} = useDraggable({
        id: makeLibraryId(media.id),
        data: {
            source: 'library',
            mediaId: media.id,
        },
    });

    return (
        <div
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            className={
                isDragging
                    ? 'cursor-grabbing rounded-md border bg-card p-3 opacity-0 shadow-sm'
                    : 'cursor-grab rounded-md border bg-card p-3 shadow-xs'
            }
        >
            <div className="flex items-start gap-3">
                <div className="text-muted-foreground mt-0.5">
                    <GripVertical className="size-4" />
                </div>
                {media.thumbUrl ? (
                    <img src={media.thumbUrl} alt={media.title} className="h-14 w-14 rounded object-cover" />
                ) : (
                    <div
                        className="bg-muted text-muted-foreground flex h-14 w-14 items-center justify-center rounded">
                        <MediaKindIcon kind="image" />
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" title={media.title}>{media.title}</p>
                    <p className="text-muted-foreground line-clamp-2 text-xs">{media.description}</p>
                    <p className="text-muted-foreground mt-1 text-xs">{formatDurationSeconds(media.durationSeconds)}</p>
                </div>
            </div>
        </div>
    );
}

type SortableTimelineItemProps = {
    item: TimelineMediaItem;
    index: number;
    count: number;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onRemove: () => void;
    onReactivate: () => void;
    isReactivating: boolean;
};

function SortableTimelineItem({
                                  item,
                                  index,
                                  count,
                                  onMoveUp,
                                  onMoveDown,
                                  onRemove,
                                  onReactivate,
                                  isReactivating,
                              }: SortableTimelineItemProps) {
    const currentReturnTo = useCurrentReturnTo();
    const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({
        id: makeTimelineId(item.entryId),
        data: {source: 'timeline'},
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition: transition ?? 'transform 180ms cubic-bezier(0.2, 0.65, 0.35, 1)',
        zIndex: isDragging ? 10 : 'auto',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={item.active
                ? isDragging
                    ? 'rounded-md border bg-card p-3 shadow-lg'
                    : 'rounded-md border bg-card p-3'
                : isDragging
                    ? 'rounded-md border border-amber-300 bg-amber-50 p-3 shadow-lg'
                    : 'rounded-md border border-amber-300 bg-amber-50 p-3'}
        >
            <div className="flex items-start gap-3">
                <button
                    type="button"
                    className="text-muted-foreground mt-0.5 cursor-grab active:cursor-grabbing"
                    {...attributes}
                    {...listeners}
                    aria-label={`Réordonner ${item.title}`}
                >
                    <GripVertical className="size-4" />
                </button>

                {item.thumbUrl ? (
                    <img src={item.thumbUrl} alt={item.title} className="h-14 w-14 rounded object-cover" />
                ) : (
                    <div
                        className="bg-muted text-muted-foreground flex h-14 w-14 items-center justify-center rounded">
                        <MediaKindIcon kind="image" />
                    </div>
                )}

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href={appendReturnTo(`/dashboard/media/${item.mediaItemId}`, currentReturnTo)}
                            className="truncate text-sm font-medium underline-offset-4 hover:underline"
                            title={item.title}
                        >
                            {item.title}
                        </Link>
                        {!item.active ? (
                            <Badge variant="outline" className="text-amber-700 border-amber-400">
                                Inactif
                            </Badge>
                        ) : null}
                    </div>
                    <p className="text-muted-foreground line-clamp-2 text-xs">{item.description}</p>
                    <p className="text-muted-foreground mt-1 text-xs">{formatDurationSeconds(item.durationSeconds)}</p>
                    {!item.active ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <p className="flex items-center gap-1 text-xs text-amber-700">
                                <TriangleAlert className="size-3.5" />
                                Ce média est inactif et ne sera pas diffusé.
                            </p>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={onReactivate}
                                disabled={isReactivating}
                            >
                                Réactiver le média
                            </Button>
                        </div>
                    ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onMoveUp}
                        disabled={index === 0}
                        aria-label="Monter"
                    >
                        <ArrowUp className="size-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onMoveDown}
                        disabled={index === count - 1}
                        aria-label="Descendre"
                    >
                        <ArrowDown className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Retirer">
                        <X className="size-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

function TimelineInsertPlaceholder() {
    return (
        <div
            className="rounded-md border-2 border-dashed border-blue-400 bg-blue-50 p-2 text-center text-xs text-blue-700">
            Insérer ici
        </div>
    );
}

export function PlaylistEditor({playlistId, availableMedia, initialTimeline}: PlaylistEditorProps) {
    const router = useRouter();
    const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 6}}));
    const [query, setQuery] = React.useState('');
    const [timeline, setTimeline] = React.useState<TimelineMediaItem[]>(initialTimeline);
    const [saveStatus, setSaveStatus] = React.useState<'saved' | 'saving' | 'error'>('saved');
    const [isRetrying, setIsRetrying] = React.useState(false);
    const [reactivatingMediaIds, setReactivatingMediaIds] = React.useState<string[]>([]);
    const [isSideBySide, setIsSideBySide] = React.useState(false);
    const [timelineCardHeight, setTimelineCardHeight] = React.useState<number | null>(null);
    const [activeDrag, setActiveDrag] = React.useState<
        | { type: 'library'; mediaId: string }
        | { type: 'timeline'; entryId: string }
        | null
    >(null);
    const [dragInsertIndex, setDragInsertIndex] = React.useState<number | null>(null);
    const latestSaveVersion = React.useRef(0);
    const isFirstRender = React.useRef(true);
    const initialPayload = React.useMemo<PlaylistTimelineReplaceValues>(() => ({
        items: initialTimeline.map((item) => ({mediaItemId: item.mediaItemId})),
    }), [initialTimeline]);
    const lastPayloadRef = React.useRef<PlaylistTimelineReplaceValues>(initialPayload);
    const lastPayloadKeyRef = React.useRef<string>(buildTimelinePayloadKey(initialPayload));
    const lastSavedPayloadKeyRef = React.useRef<string>(buildTimelinePayloadKey(initialPayload));
    const timelineCardRef = React.useRef<HTMLDivElement | null>(null);
    const dropzoneElementRef = React.useRef<HTMLDivElement | null>(null);

    const {setNodeRef: setDropzoneRef, isOver} = useDroppable({
        id: TIMELINE_DROPZONE_ID,
        data: {source: 'timeline-dropzone'},
    });
    const setTimelineDropzoneRef = React.useCallback((node: HTMLDivElement | null) => {
        dropzoneElementRef.current = node;
        setDropzoneRef(node);
    }, [setDropzoneRef]);

    const isDragInsideEmptyDropzone = React.useCallback((event: DragMoveEvent | DragOverEvent | DragEndEvent) => {
        if (timeline.length !== 0) return false;
        const pointer = getDragPointerPosition(event);
        const dropzone = dropzoneElementRef.current;
        if (!pointer || !dropzone) return false;

        const rect = dropzone.getBoundingClientRect();
        return (
            pointer.x >= rect.left
            && pointer.x <= rect.right
            && pointer.y >= rect.top
            && pointer.y <= rect.bottom
        );
    }, [timeline.length]);

    const availableById = React.useMemo(() => {
        const index = new Map<string, AvailableMediaItem>();
        for (const media of availableMedia) {
            index.set(media.id, media);
        }
        return index;
    }, [availableMedia]);

    const filteredAvailableMedia = React.useMemo(() => {
        const q = query.toLowerCase().trim();
        return availableMedia.filter((media) => {
            if (!q) return true;
            return `${media.title} ${media.description}`.toLowerCase().includes(q);
        });
    }, [availableMedia, query]);

    React.useEffect(() => {
        const mediaQuery = window.matchMedia('(min-width: 1024px)');
        const handleChange = (event: MediaQueryListEvent) => {
            setIsSideBySide(event.matches);
        };
        setIsSideBySide(mediaQuery.matches);
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    React.useEffect(() => {
        if (!isSideBySide) {
            setTimelineCardHeight(null);
            return;
        }

        const node = timelineCardRef.current;
        if (!node) return;

        const updateHeight = () => {
            setTimelineCardHeight(node.getBoundingClientRect().height);
        };

        updateHeight();
        const observer = new ResizeObserver(updateHeight);
        observer.observe(node);
        return () => observer.disconnect();
    }, [isSideBySide]);

    const mediaCount = timeline.length;
    const totalDurationSeconds = timeline.reduce((sum, item) => sum + item.durationSeconds, 0);
    const inactiveMediaCount = timeline.reduce((sum, item) => sum + (item.active ? 0 : 1), 0);

    const persistTimeline = React.useCallback(async (
        payload: PlaylistTimelineReplaceValues,
        payloadKey: string,
        version: number,
    ) => {
        const startedAt = Date.now();
        setSaveStatus('saving');

        const result = await replacePlaylistTimeline(playlistId, payload);
        const minVisualDurationMs = 350;
        const elapsed = Date.now() - startedAt;
        if (elapsed < minVisualDurationMs) {
            await new Promise((resolve) => setTimeout(resolve, minVisualDurationMs - elapsed));
        }
        if (version !== latestSaveVersion.current) return;

        if (!result.ok) {
            setSaveStatus('error');
            toast.error(result.message);
            return;
        }

        lastSavedPayloadKeyRef.current = payloadKey;
        setSaveStatus('saved');
    }, [playlistId]);

    React.useEffect(() => {
        const payload = {
            items: timeline.map((item) => ({mediaItemId: item.mediaItemId})),
        };
        lastPayloadRef.current = payload;
        const payloadKey = buildTimelinePayloadKey(payload);
        lastPayloadKeyRef.current = payloadKey;

        if (isFirstRender.current) {
            isFirstRender.current = false;
            lastSavedPayloadKeyRef.current = payloadKey;
            return;
        }

        if (payloadKey === lastSavedPayloadKeyRef.current) {
            return;
        }

        const version = ++latestSaveVersion.current;
        const timeout = setTimeout(() => {
            void persistTimeline(payload, payloadKey, version);
        }, 800);

        return () => clearTimeout(timeout);
    }, [timeline, persistTimeline]);

    const onRetrySave = async () => {
        setIsRetrying(true);
        const version = ++latestSaveVersion.current;
        await persistTimeline(lastPayloadRef.current, lastPayloadKeyRef.current, version);
        setIsRetrying(false);
    };

    const addMediaToTimeline = (mediaId: string, insertAt?: number) => {
        const media = availableById.get(mediaId);
        if (!media) return;

        const nextItem: TimelineMediaItem = {
            entryId: createTimelineEntryId(media.id),
            mediaItemId: media.id,
            title: media.title,
            description: media.description,
            durationSeconds: media.durationSeconds,
            thumbUrl: media.thumbUrl,
            active: true,
        };

        setTimeline((prev) => {
            if (typeof insertAt !== 'number' || insertAt < 0 || insertAt >= prev.length) {
                return [...prev, nextItem];
            }
            const next = [...prev];
            next.splice(insertAt, 0, nextItem);
            return next;
        });
    };

    const onDragStart = (event: DragStartEvent) => {
        const source = event.active.data.current?.source as string | undefined;
        if (source === 'library') {
            const mediaId = (event.active.data.current?.mediaId as string | undefined) ?? null;
            if (mediaId) setActiveDrag({type: 'library', mediaId});
            return;
        }

        setActiveDrag(null);
    };

    const onDragOver = (event: DragOverEvent) => {
        updateDragInsertIndex(event);
    };

    const onDragMove = (event: DragMoveEvent) => {
        updateDragInsertIndex(event);
    };

    const updateDragInsertIndex = (event: DragOverEvent | DragMoveEvent) => {
        if (activeDrag?.type !== 'library') {
            setDragInsertIndex(null);
            return;
        }

        const over = event.over;
        if (!over) {
            setDragInsertIndex(isDragInsideEmptyDropzone(event) ? 0 : null);
            return;
        }

        const overSource = over.data.current?.source as string | undefined;
        if (overSource === 'timeline') {
            const overEntryId = parseTimelineId(over.id);
            if (!overEntryId) {
                setDragInsertIndex(null);
                return;
            }
            const overIndex = timeline.findIndex((item) => item.entryId === overEntryId);
            if (overIndex < 0) {
                setDragInsertIndex(null);
                return;
            }

            const pointerY = getDragPointerY(event);
            const overMiddleY = over.rect.top + over.rect.height / 2;
            const isOverLowerHalf = typeof pointerY === 'number' && pointerY > overMiddleY;
            const isLastItem = overIndex === timeline.length - 1;

            if (isLastItem && isOverLowerHalf) {
                setDragInsertIndex(timeline.length);
                return;
            }

            setDragInsertIndex(Math.min(overIndex, timeline.length));
            return;
        }

        if (over.id === TIMELINE_DROPZONE_ID) {
            const pointerY = getDragPointerY(event);
            if (typeof pointerY !== 'number') {
                setDragInsertIndex(timeline.length);
                return;
            }

            const dropzoneMiddleY = over.rect.top + over.rect.height / 2;
            setDragInsertIndex(pointerY < dropzoneMiddleY ? 0 : timeline.length);
            return;
        }

        setDragInsertIndex(null);
    };

    const onDragCancel = () => {
        setActiveDrag(null);
        setDragInsertIndex(null);
    };

    const onDragEnd = (event: DragEndEvent) => {
        const {active, over} = event;

        const activeSource = active.data.current?.source as string | undefined;
        const overSource = over?.data.current?.source as string | undefined;

        if (activeSource === 'library') {
            const mediaId = (active.data.current?.mediaId as string | undefined) ?? null;
            const droppedOnTimeline = !!over && (overSource === 'timeline' || over.id === TIMELINE_DROPZONE_ID);
            const droppedInsideEmptyDropzone = isDragInsideEmptyDropzone(event);
            const canDrop = droppedOnTimeline || droppedInsideEmptyDropzone;

            if (mediaId && canDrop) {
                addMediaToTimeline(mediaId, dragInsertIndex ?? timeline.length);
            }

            setActiveDrag(null);
            setDragInsertIndex(null);
            return;
        }


        if (!over) {
            setActiveDrag(null);
            setDragInsertIndex(null);
            return;
        }

        if (activeSource === 'timeline') {
            const activeEntryId = parseTimelineId(active.id);
            if (!activeEntryId) return;

            const activeIndex = timeline.findIndex((item) => item.entryId === activeEntryId);
            if (activeIndex < 0) return;

            if (overSource === 'timeline') {
                const overEntryId = parseTimelineId(over.id);
                if (!overEntryId) return;
                const overIndex = timeline.findIndex((item) => item.entryId === overEntryId);
                if (overIndex < 0 || overIndex === activeIndex) return;

                setTimeline((prev) => arrayMove(prev, activeIndex, overIndex));
                return;
            }

            if (over.id === TIMELINE_DROPZONE_ID && activeIndex !== timeline.length - 1) {
                setTimeline((prev) => arrayMove(prev, activeIndex, prev.length - 1));
            }
        }

        setActiveDrag(null);
        setDragInsertIndex(null);
    };

    const moveItem = (from: number, to: number) => {
        if (from === to || from < 0 || to < 0 || from >= timeline.length || to >= timeline.length) return;
        setTimeline((prev) => arrayMove(prev, from, to));
    };

    const removeItem = (entryId: string) => {
        setTimeline((prev) => prev.filter((item) => item.entryId !== entryId));
    };

    const reactivateMedia = async (mediaItemId: string) => {
        setReactivatingMediaIds((prev) => [...prev, mediaItemId]);
        const result = await toggleMediaItemActive(mediaItemId);
        setReactivatingMediaIds((prev) => prev.filter((id) => id !== mediaItemId));

        if (!result.ok) {
            toast.error(result.message);
            return;
        }

        toast.success('Média activé.');
        setTimeline((prev) =>
            prev.map((item) =>
                item.mediaItemId === mediaItemId
                    ? {...item, active: true}
                    : item,
            ),
        );
        router.refresh();
    };

    const timelineSortableIds = React.useMemo(() => timeline.map((item) => makeTimelineId(item.entryId)), [timeline]);
    const activeLibraryMedia = activeDrag?.type === 'library' ? availableById.get(activeDrag.mediaId) ?? null : null;
    const mediaLibraryCardHeight = isSideBySide && timelineCardHeight
        ? Math.max(Math.round(timelineCardHeight), MIN_MEDIA_LIBRARY_CARD_HEIGHT_PX)
        : null;
    const isEmptyDropActive = timeline.length === 0 && activeDrag?.type === 'library' && dragInsertIndex === 0;
    return (
        <DndContext
            sensors={sensors}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onDragCancel={onDragCancel}
        >
            <div className="grid items-start gap-4 lg:grid-cols-5">
                <Card
                    className="flex min-h-0 flex-col lg:col-span-2 lg:self-start"
                    style={mediaLibraryCardHeight
                        ? {height: `${mediaLibraryCardHeight}px`}
                        : undefined}
                >
                    <CardHeader>
                        <CardTitle>Médias disponibles</CardTitle>
                        <CardDescription>
                            Recherchez un média actif puis glissez-le dans la timeline.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex min-h-0 flex-1 flex-col space-y-3 overflow-hidden">
                        <InputGroup className="mt-1">
                            <InputGroupInput
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Rechercher un média actif..."
                                className="pl-8"
                            />
                            <InputGroupAddon align="inline-start">
                                <Search />
                            </InputGroupAddon>
                            {query ?
                                <InputGroupAddon align="inline-end">
                                    <InputGroupButton
                                        aria-label={'Effacer la recherche'}
                                        onClick={() => setQuery('')}
                                        type="button"
                                        variant="ghost"
                                        size="icon-xs"
                                    >
                                        <X className="size-4" />
                                    </InputGroupButton>
                                </InputGroupAddon>
                                : null}
                        </InputGroup>

                        <ScrollArea
                            className={cn(
                                'min-h-0 pr-2',
                                isSideBySide ? 'h-full flex-1' : 'max-h-[60vh]',
                            )}
                        >
                            <div className="space-y-2">
                                {filteredAvailableMedia.length === 0 ? (
                                    <p className="text-muted-foreground py-6 text-center text-sm">
                                        Aucun média actif trouvé.
                                    </p>
                                ) : (
                                    filteredAvailableMedia.map((media) => (
                                        <DraggableMediaCard key={media.id} media={media} />
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                <Card
                    ref={timelineCardRef}
                    className="flex flex-col lg:col-span-3 lg:self-start"
                    style={isSideBySide ? {minHeight: `${MIN_MEDIA_LIBRARY_CARD_HEIGHT_PX}px`} : undefined}
                >
                    <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <CardTitle>Timeline de la playlist</CardTitle>
                                <CardDescription>
                                    Glissez-déposez les médias pour définir l&apos;ordre de diffusion.
                                </CardDescription>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary">{pluralizeMedia(mediaCount)}</Badge>
                                <Badge variant="secondary">{formatDurationSeconds(totalDurationSeconds)}</Badge>
                                <Badge
                                    variant={inactiveMediaCount > 0 ? 'outline' : 'secondary'}
                                    className={inactiveMediaCount > 0 ? 'text-amber-700 border-amber-400' : undefined}
                                >
                                    {pluralizeInactive(inactiveMediaCount)}
                                </Badge>
                                <Badge
                                    variant={saveStatus === 'error' ? 'destructive' : 'outline'}
                                    className={saveStatus === 'saved' ? 'text-emerald-700 border-emerald-300' : undefined}
                                >
                                    {saveStatus === 'saving' ? <Spinner className="size-3" /> : null}
                                    {saveStatus === 'saved'
                                        ? 'Enregistré'
                                        : saveStatus === 'saving'
                                            ? 'Enregistrement...'
                                            : 'Erreur de sauvegarde'}
                                </Badge>
                                {saveStatus === 'error' ? (
                                    <Button size="sm" variant="outline" onClick={onRetrySave} disabled={isRetrying}>
                                        Réessayer
                                    </Button>
                                ) : null}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div
                            ref={setTimelineDropzoneRef}
                            className={cn(
                                'w-full min-h-30 space-y-2 rounded-md border border-dashed p-2',
                                isSideBySide && 'flex-1',
                                timeline.length === 0 && 'flex items-center justify-center p-6',
                                (isOver || isEmptyDropActive) && 'border-2 border-blue-400 bg-blue-50',
                            )}
                        >
                            <SortableContext items={timelineSortableIds} strategy={verticalListSortingStrategy}>
                                {timeline.length === 0 ? (
                                    <div className="text-center">
                                        <p className="text-muted-foreground text-sm">
                                            Glissez un média ici pour démarrer la playlist.
                                        </p>
                                        {activeDrag?.type === 'library' && dragInsertIndex === 0 ? (
                                            <p className="mt-2 text-sm font-medium text-blue-700">
                                                Relâchez pour l&apos;ajouter.
                                            </p>
                                        ) : null}
                                    </div>
                                ) : (
                                    timeline.map((item, index) => (
                                        <React.Fragment key={item.entryId}>
                                            {activeDrag?.type === 'library' && dragInsertIndex === index ? (
                                                <TimelineInsertPlaceholder />
                                            ) : null}
                                            <SortableTimelineItem
                                                item={item}
                                                index={index}
                                                count={timeline.length}
                                                onMoveUp={() => moveItem(index, index - 1)}
                                                onMoveDown={() => moveItem(index, index + 1)}
                                                onRemove={() => removeItem(item.entryId)}
                                                onReactivate={() => reactivateMedia(item.mediaItemId)}
                                                isReactivating={reactivatingMediaIds.includes(item.mediaItemId)}
                                            />
                                        </React.Fragment>
                                    ))
                                )}
                                {timeline.length > 0 && activeDrag?.type === 'library' && dragInsertIndex === timeline.length ? (
                                    <TimelineInsertPlaceholder />
                                ) : null}
                            </SortableContext>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <DragOverlay zIndex={2000} dropAnimation={null}>
                {activeLibraryMedia ? (
                    <div className="w-85 rounded-md border bg-card p-3 shadow-xl">
                        <div className="flex items-start gap-3">
                            <div className="text-muted-foreground mt-0.5">
                                <GripVertical className="size-4" />
                            </div>
                            {activeLibraryMedia.thumbUrl ? (
                                <img
                                    src={activeLibraryMedia.thumbUrl}
                                    alt={activeLibraryMedia.title}
                                    className="h-14 w-14 rounded object-cover"
                                />
                            ) : (
                                <div
                                    className="bg-muted text-muted-foreground flex h-14 w-14 items-center justify-center rounded text-xs">
                                    Aucun
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{activeLibraryMedia.title}</p>
                                <p className="text-muted-foreground line-clamp-2 text-xs">{activeLibraryMedia.description}</p>
                                <p className="text-muted-foreground mt-1 text-xs">
                                    {formatDurationSeconds(activeLibraryMedia.durationSeconds)}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

export type { AvailableMediaItem, TimelineMediaItem };
