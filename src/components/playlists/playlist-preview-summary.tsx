'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';

export type PlaylistPreviewSummaryItem = {
    thumbUrl: string | null;
};

type PlaylistPreviewSummaryProps = {
    name: string;
    mediaCount: number;
    totalDurationLabel: string;
    previewItems: PlaylistPreviewSummaryItem[];
    size?: 'sm' | 'md';
    className?: string;
    titleLink?: string;
};

export function PlaylistPreviewSummary({
                                           name,
                                           mediaCount,
                                           totalDurationLabel,
                                           previewItems,
                                           size = 'md',
                                           className,
                                           titleLink,
                                       }: PlaylistPreviewSummaryProps) {
    const thumbnailSizeClassName = size === 'sm' ? 'size-10' : 'size-12';
    const remainingMediaCount = Math.max(mediaCount - previewItems.length, 0);

    return (
        <div className={cn('flex min-w-0 items-center gap-3', className)}>
            <div className="flex shrink-0 -space-x-2" aria-hidden="true">
                {previewItems.length > 0 ? (
                    <>
                        {previewItems.map((item, index) => (
                            <div
                                key={`${name}-${index}`}
                                className={cn(
                                    'bg-muted ring-background flex items-center justify-center overflow-hidden rounded-md ring-2',
                                    thumbnailSizeClassName,
                                )}
                            >
                                {item.thumbUrl ? (
                                    <img src={item.thumbUrl} alt="" className="size-full object-cover" />
                                ) : (
                                    <span className="text-muted-foreground text-[10px] font-medium">Aperçu</span>
                                )}
                            </div>
                        ))}
                        {remainingMediaCount > 0 ? (
                            <div
                                className={cn(
                                    'bg-muted text-foreground ring-background flex items-center justify-center rounded-md border border-border/60 text-xs font-semibold ring-2',
                                    thumbnailSizeClassName,
                                )}
                            >
                                +{remainingMediaCount}
                            </div>
                        ) : null}
                    </>
                ) : (
                    <div
                        className={cn(
                            'bg-muted text-muted-foreground ring-background flex items-center justify-center rounded-md text-[10px] font-medium ring-2',
                            thumbnailSizeClassName,
                        )}
                    >
                        Vide
                    </div>
                )}
            </div>

            <div className="min-w-0 h-full flex flex-col justify-around">
                {titleLink ?
                    <Link
                        href={titleLink}
                        className="w-fit font-medium underline underline-offset-4"
                        aria-label={name}
                    >
                        {name}
                    </Link>
                    : <p className="truncate font-medium">{name}</p>
                }
                <p className="text-muted-foreground text-xs">
                    {mediaCount} média{mediaCount > 1 ? 's' : ''} · {totalDurationLabel}
                </p>
            </div>
        </div>
    );
}
