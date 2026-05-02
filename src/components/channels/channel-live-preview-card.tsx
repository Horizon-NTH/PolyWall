'use client';

import * as React from 'react';

import { DisplayPlaybackSurface } from '@/components/screens/display-playback-surface';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { type DisplayRuntimeSnapshot, type DisplaySyncStatus } from '@/lib/display-runtime/types';
import { computeServerOffsetMs } from '@/lib/screens/display-clock';

type ChannelLivePreviewCardProps = {
    channelId: string;
};

type PreviewResponse = {
    snapshot: DisplayRuntimeSnapshot;
};

function getStatusLabel(syncStatus: DisplaySyncStatus) {
    switch (syncStatus) {
        case 'DEGRADED':
            return 'Dégradé';
        case 'SYNCING':
            return 'Synchronisation';
        case 'ERROR':
            return 'Erreur';
        default:
            return 'Live';
    }
}

export function ChannelLivePreviewCard({channelId}: ChannelLivePreviewCardProps) {
    const [snapshot, setSnapshot] = React.useState<DisplayRuntimeSnapshot | null>(null);
    const [snapshotChannelId, setSnapshotChannelId] = React.useState<string | null>(null);
    const [statusChannelId, setStatusChannelId] = React.useState<string | null>(null);
    const [syncStatus, setSyncStatus] = React.useState<DisplaySyncStatus>('SYNCING');
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
    const [serverOffsetMs, setServerOffsetMs] = React.useState(0);
    const syncInFlightRef = React.useRef(false);
    const snapshotRef = React.useRef<DisplayRuntimeSnapshot | null>(null);
    const snapshotChannelIdRef = React.useRef<string | null>(null);

    React.useEffect(() => {
        snapshotRef.current = snapshot;
        snapshotChannelIdRef.current = snapshotChannelId;
    }, [snapshot, snapshotChannelId]);

    React.useEffect(() => {
        let cancelled = false;

        const synchronize = async () => {
            if (cancelled || syncInFlightRef.current) {
                return;
            }

            syncInFlightRef.current = true;

            try {
                const startedAtMs = Date.now();
                const response = await fetch(`/api/channels/${encodeURIComponent(channelId)}/display-preview`, {
                    cache: 'no-store',
                });
                const endedAtMs = Date.now();

                if (cancelled) {
                    return;
                }

                if (!response.ok) {
                    if (snapshotRef.current && snapshotChannelIdRef.current === channelId) {
                        setStatusChannelId(channelId);
                        setSyncStatus('DEGRADED');
                        return;
                    }

                    const data = await response.json().catch(() => ({}));
                    if (cancelled) {
                        return;
                    }

                    setStatusChannelId(channelId);
                    setErrorMessage(data.error ?? 'Impossible de charger l’aperçu de diffusion.');
                    setSyncStatus('ERROR');
                    return;
                }

                const data = await response.json() as PreviewResponse;
                if (cancelled) {
                    return;
                }

                const nextOffset = computeServerOffsetMs(data.snapshot.serverNow, startedAtMs, endedAtMs);
                if (nextOffset !== null) {
                    setServerOffsetMs(nextOffset);
                }
                setSnapshotChannelId(channelId);
                setStatusChannelId(channelId);
                setSnapshot(data.snapshot);
                setErrorMessage(null);
                setSyncStatus('PLAYING');
            } catch {
                if (cancelled) return;

                if (snapshotRef.current && snapshotChannelIdRef.current === channelId) {
                    setStatusChannelId(channelId);
                    setSyncStatus('DEGRADED');
                    return;
                }

                setStatusChannelId(channelId);
                setErrorMessage('Erreur réseau pendant le chargement de l’aperçu de diffusion.');
                setSyncStatus('ERROR');
            } finally {
                syncInFlightRef.current = false;
            }
        };

        void synchronize();

        const interval = window.setInterval(() => {
            if (document.visibilityState === 'hidden') return;
            void synchronize();
        }, 15000);

        const handleOnline = () => {
            void synchronize();
        };

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                void synchronize();
            }
        };

        window.addEventListener('online', handleOnline);
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            cancelled = true;
            syncInFlightRef.current = false;
            window.clearInterval(interval);
            window.removeEventListener('online', handleOnline);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [channelId]);

    const visibleSnapshot = snapshotChannelId === channelId ? snapshot : null;
    const visibleSyncStatus = statusChannelId === channelId ? syncStatus : 'SYNCING';
    const visibleErrorMessage = statusChannelId === channelId ? errorMessage : null;
    const template = visibleSnapshot?.channel.template ?? null;

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="min-w-0">
                    <CardTitle>Aperçu de diffusion</CardTitle>
                    <CardDescription>
                        Rendu en temps réel du player utilisé par les écrans rattachés à ce canal.
                    </CardDescription>
                </div>
                <Badge variant={visibleSyncStatus === 'DEGRADED' || visibleSyncStatus === 'ERROR' ? 'destructive' : 'outline'}>
                    {getStatusLabel(visibleSyncStatus)}
                </Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                {visibleSnapshot ? (
                    <div className="rounded-md border bg-black p-2">
                        <div
                            className="mx-auto w-full max-w-full overflow-hidden rounded-sm bg-black"
                            style={{aspectRatio: `${template?.resolutionX ?? 16} / ${template?.resolutionY ?? 9}`}}
                        >
                            <DisplayPlaybackSurface
                                snapshot={visibleSnapshot}
                                syncStatus={visibleSyncStatus}
                                serverOffsetMs={serverOffsetMs}
                            />
                        </div>
                    </div>
                ) : visibleSyncStatus === 'ERROR' ? (
                    <Alert variant="destructive">
                        <AlertTitle>Aperçu indisponible</AlertTitle>
                        <AlertDescription>{visibleErrorMessage ?? 'Impossible de charger la diffusion.'}</AlertDescription>
                    </Alert>
                ) : (
                    <Skeleton className="aspect-video w-full rounded-md" />
                )}
            </CardContent>
        </Card>
    );
}
