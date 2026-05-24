'use client';

import * as React from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { type DisplaySequenceItem } from '@/lib/display-runtime/types';
import { cn } from '@/lib/utils';

export function DisplaySequenceMedia({
                                         item,
                                         src,
                                         playing,
                                         itemOffsetSeconds,
                                         className,
                                         style,
                                     }: {
    item: DisplaySequenceItem;
    src: string | null;
    playing: boolean;
    itemOffsetSeconds: number;
    className?: string;
    style?: React.CSSProperties;
}) {
    const videoRef = React.useRef<HTMLVideoElement | null>(null);
    const itemOffsetSecondsRef = React.useRef(itemOffsetSeconds);

    React.useEffect(() => {
        itemOffsetSecondsRef.current = itemOffsetSeconds;
    }, [itemOffsetSeconds]);

    React.useEffect(() => {
        const videoElement = videoRef.current;
        if (!videoElement || item.mediaKind !== 'video') {
            return;
        }

        if (!playing) {
            videoElement.pause();
            return;
        }

        const syncVideo = () => {
            const targetTime = itemOffsetSecondsRef.current;
            if (Math.abs(videoElement.currentTime - targetTime) > 0.75) {
                videoElement.currentTime = targetTime;
            }
        };

        syncVideo();
        videoElement.addEventListener('loadedmetadata', syncVideo);

        return () => {
            videoElement.removeEventListener('loadedmetadata', syncVideo);
        };
    }, [
        item.id,
        item.mediaKind,
        playing,
        src,
    ]);

    if (!src) {
        return <Skeleton className="h-full w-full rounded-none" />;
    }

    if (item.mediaKind === 'video') {
        return (
            <div className="flex h-full w-full items-center justify-center overflow-hidden">
                <video
                    ref={videoRef}
                    key={item.id}
                    src={src}
                    autoPlay={playing}
                    muted
                    playsInline
                    preload="auto"
                    className={cn('h-full w-full object-contain', className)}
                    style={style}
                />
            </div>
        );
    }

    return (
        <div className="flex h-full w-full items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={src}
                alt={item.mediaTitle}
                className={cn('h-full w-full object-contain', className)}
                style={style}
                draggable={false}
            />
        </div>
    );
}
