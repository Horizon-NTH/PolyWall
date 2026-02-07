'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { deleteMediaItem, toggleMediaItemActive } from '@/actions/media-actions';
import { MediaCard } from '@/components/media/media-card';
import { MediaEmptyState } from '@/components/media/media-empty-state';
import { MediaFilters } from '@/components/media/media-filters';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { MediaFileStatus } from '@/generated/prisma/enums';
import { getMediaKindLabel, getMediaStatusLabel, type MediaKind } from '@/lib/media/media-view-model';
import { mediaListFilterSchema, type MediaListFilterValues } from '@/schemas/media-schema';

type MediaGridItem = {
    id: string;
    title: string;
    description: string;
    active: boolean;
    updatedAt: string;
    createdAt: string;
    kind: MediaKind;
    status: MediaFileStatus;
    thumbUrl: string | null;
    sizeBytes: number | null;
};

type MediaGridProps = {
    data: MediaGridItem[];
};

const defaultFilters = mediaListFilterSchema.parse({});

function hasActiveFilters(filters: MediaListFilterValues) {
    return (
        filters.q.trim().length > 0 ||
        filters.type !== defaultFilters.type ||
        filters.status !== defaultFilters.status ||
        filters.active !== defaultFilters.active ||
        filters.sort !== defaultFilters.sort
    );
}

function bySort(sort: MediaListFilterValues['sort']) {
    if (sort === 'updatedAt-desc') return (a: MediaGridItem, b: MediaGridItem) => b.updatedAt.localeCompare(a.updatedAt);
    if (sort === 'updatedAt-asc') return (a: MediaGridItem, b: MediaGridItem) => a.updatedAt.localeCompare(b.updatedAt);
    if (sort === 'createdAt-desc') return (a: MediaGridItem, b: MediaGridItem) => b.createdAt.localeCompare(a.createdAt);
    if (sort === 'createdAt-asc') return (a: MediaGridItem, b: MediaGridItem) => a.createdAt.localeCompare(b.createdAt);
    if (sort === 'title-asc') return (a: MediaGridItem, b: MediaGridItem) => a.title.localeCompare(b.title, 'fr');
    if (sort === 'title-desc') return (a: MediaGridItem, b: MediaGridItem) => b.title.localeCompare(a.title, 'fr');
    if (sort === 'size-desc') return (a: MediaGridItem, b: MediaGridItem) => (b.sizeBytes ?? 0) - (a.sizeBytes ?? 0);
    return (a: MediaGridItem, b: MediaGridItem) => (a.sizeBytes ?? 0) - (b.sizeBytes ?? 0);
}

export function MediaGrid({data}: MediaGridProps) {
    const router = useRouter();
    const [filters, setFilters] = useState<MediaListFilterValues>(defaultFilters);
    const [isPending, startTransition] = useTransition();
    const [deleteTarget, setDeleteTarget] = useState<MediaGridItem | null>(null);

    const filtered = useMemo(() => {
        const query = filters.q.toLowerCase();

        return data
            .filter((item) => {
                if (query.length > 0) {
                    const haystack = `${item.title} ${item.description}`.toLowerCase();
                    if (!haystack.includes(query)) return false;
                }

                if (filters.type !== 'all' && item.kind !== filters.type) {
                    return false;
                }

                if (filters.status !== 'all' && item.status.toLowerCase() !== filters.status) {
                    return false;
                }

                if (filters.active === 'active' && !item.active) {
                    return false;
                }

                return !(filters.active === 'inactive' && item.active);
            })
            .sort(bySort(filters.sort));
    }, [data, filters]);

    const onToggle = (item: MediaGridItem) => {
        startTransition(async () => {
            const result = await toggleMediaItemActive(item.id);
            if (!result.ok) {
                toast.error(result.message);
                return;
            }

            toast.success(item.active ? 'Média désactivé.' : 'Média activé.');
            router.refresh();
        });
    };

    const onDeleteConfirm = () => {
        if (!deleteTarget) return;

        startTransition(async () => {
            const result = await deleteMediaItem(deleteTarget.id);
            if (!result.ok) {
                toast.error(result.message);
                return;
            }

            toast.success('Média supprimé.');
            setDeleteTarget(null);
            router.refresh();
        });
    };

    const onReset = () => {
        setFilters(defaultFilters);
    };

    return (
        <div className="flex flex-col gap-4">
            <MediaFilters
                filters={filters}
                onChange={(next) => setFilters((prev) => ({...prev, ...next}))}
                onReset={onReset}
                showReset={hasActiveFilters(filters)}
            />

            {filtered.length === 0 ? (
                <MediaEmptyState />
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filtered.map((item) => (
                        <MediaCard
                            key={item.id}
                            item={item}
                            statusLabel={getMediaStatusLabel(item.status)}
                            kindLabel={getMediaKindLabel(item.kind)}
                            onToggle={() => onToggle(item)}
                            onDelete={() => setDeleteTarget(item)}
                            isPending={isPending}
                        />
                    ))}
                </div>
            )}

            <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Supprimer ce média ?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est définitive. Le média, son original et ses variantes seront supprimés.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={onDeleteConfirm} variant="destructive" disabled={isPending}>
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export type { MediaGridItem };
