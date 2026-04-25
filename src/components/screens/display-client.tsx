'use client';

import * as React from 'react';

import { DisplayTemplateShell } from '@/components/screens/display-template-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp';
import { getPriorityAssetDescriptors, resolveDisplayState } from '@/lib/display-runtime/runtime';
import { type DisplayRuntimeSnapshot, type DisplaySyncStatus } from '@/lib/display-runtime/types';
import {
    loadCachedSnapshot,
    saveCachedSnapshot,
    getCachedAssetObjectUrl,
    prefetchDisplayAssets,
} from '@/lib/screens/display-cache';
import { createInteractiveInterruptionController } from '@/lib/screens/interactive-interruption-controller';

type DisplayStateResponse =
    | {
    status: 'ACTIVE';
    screenId: string;
    channelId: string;
    interactive: boolean;
    interactiveUrl: string | null;
    inactivityTimeoutSeconds: number | null;
    revision: string | null;
    serverNow: string;
}
    | {
    status: 'PENDING';
    screenId: string;
    revision: null;
    serverNow: string;
}
    | {
    status: 'REVOKED';
    screenId?: string;
};

const DEVICE_ID_KEY = 'polywall.screen.deviceId';

function generateDeviceId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1);
    return `${s4()}${s4()}-${s4()}-4${s4().slice(0, 3)}-a${s4().slice(0, 3)}-${s4()}${s4()}${s4()}`;
}

function getOrCreateDeviceId() {
    const storage =
        typeof window !== 'undefined' &&
        window.localStorage &&
        typeof window.localStorage.getItem === 'function' &&
        typeof window.localStorage.setItem === 'function'
            ? window.localStorage
            : null;

    if (!storage) {
        return generateDeviceId();
    }

    const current = storage.getItem(DEVICE_ID_KEY);
    if (current) return current;

    const created = generateDeviceId();
    storage.setItem(DEVICE_ID_KEY, created);
    return created;
}

function syncServerClock(
    serverNow: string,
    startedAtMs: number,
    endedAtMs: number,
    offsetRef: { current: number },
) {
    const serverNowMs = Date.parse(serverNow);
    if (Number.isNaN(serverNowMs)) return;
    offsetRef.current = serverNowMs - Math.round((startedAtMs + endedAtMs) / 2);
}

function StatusCard(props: {
    title: string;
    description: string;
    children?: React.ReactNode;
    deviceId: string | null;
}) {
    return (
        <main className="bg-muted/30 flex min-h-screen items-center justify-center p-6">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle>{props.title}</CardTitle>
                    <CardDescription>{props.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 text-sm">
                    {props.children}
                    <p className="text-muted-foreground pt-2 text-xs">ID appareil: {props.deviceId ?? '...'}</p>
                </CardContent>
            </Card>
        </main>
    );
}

export function DisplayClient() {
    const [deviceId, setDeviceId] = React.useState<string | null>(null);
    const [syncStatus, setSyncStatus] = React.useState<DisplaySyncStatus>('SYNCING');
    const [snapshot, setSnapshot] = React.useState<DisplayRuntimeSnapshot | null>(null);
    const [otpCode, setOtpCode] = React.useState('');
    const [otpError, setOtpError] = React.useState<string | null>(null);
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
    const [isSubmittingOtp, setIsSubmittingOtp] = React.useState(false);
    const [renderTick, setRenderTick] = React.useState(0);
    const [assetSrc, setAssetSrc] = React.useState<string | null>(null);
    const serverOffsetMsRef = React.useRef(0);
    const activeObjectUrlRef = React.useRef<string | null>(null);
    const snapshotRef = React.useRef<DisplayRuntimeSnapshot | null>(null);
    const syncInFlightRef = React.useRef(false);
    const runtimeLoadPromiseRef = React.useRef<Promise<boolean> | null>(null);

    React.useEffect(() => {
        snapshotRef.current = snapshot;
    }, [snapshot]);

    const resolvedState = React.useMemo(
        () => (snapshot ? resolveDisplayState(snapshot, Date.now() + serverOffsetMsRef.current) : null),
        [snapshot, renderTick],
    );

    const currentAssetKey = resolvedState?.status === 'PLAYING' ? resolvedState.currentItem.asset.cacheKey : null;
    const currentSignedUrl = resolvedState?.status === 'PLAYING' ? resolvedState.currentItem.asset.signedUrl : null;

    const loadRuntime = React.useEffectEvent(async (resolvedDeviceId: string) => {
        if (runtimeLoadPromiseRef.current) {
            return runtimeLoadPromiseRef.current;
        }

        const runtimePromise = (async () => {
            const startedAtMs = Date.now();
            const response = await fetch(`/api/display/runtime?deviceId=${encodeURIComponent(resolvedDeviceId)}`, {
                cache: 'no-store',
            });
            const endedAtMs = Date.now();

            if (response.status === 403) {
                setSyncStatus('REVOKED');
                setSnapshot(null);
                snapshotRef.current = null;
                return false;
            }

            if (!response.ok) {
                if (snapshotRef.current) {
                    setSyncStatus('DEGRADED');
                    return false;
                }

                const data = await response.json().catch(() => ({}));
                setErrorMessage(data.error ?? 'Impossible de récupérer la diffusion.');
                setSyncStatus('ERROR');
                return false;
            }

            const nextSnapshot = await response.json() as DisplayRuntimeSnapshot;
            syncServerClock(nextSnapshot.serverNow, startedAtMs, endedAtMs, serverOffsetMsRef);
            saveCachedSnapshot(resolvedDeviceId, nextSnapshot);
            setSnapshot(nextSnapshot);
            setSyncStatus('PLAYING');

            const nextResolvedState = resolveDisplayState(nextSnapshot, Date.now() + serverOffsetMsRef.current);
            const prioritizedAssets = getPriorityAssetDescriptors(nextSnapshot, nextResolvedState);
            const protectedKeys = prioritizedAssets.slice(0, 12).map((asset) => asset.cacheKey);
            void prefetchDisplayAssets(prioritizedAssets, nextSnapshot.revision, protectedKeys);
            return true;
        })();

        runtimeLoadPromiseRef.current = runtimePromise;

        try {
            return await runtimePromise;
        } finally {
            runtimeLoadPromiseRef.current = null;
        }
    });

    const fetchState = React.useEffectEvent(async (resolvedDeviceId: string) => {
        const startedAtMs = Date.now();
        const response = await fetch(`/api/display/state?deviceId=${encodeURIComponent(resolvedDeviceId)}`, {
            cache: 'no-store',
        });
        const endedAtMs = Date.now();

        if (response.status === 404) {
            setSyncStatus('PAIRING');
            setSnapshot(null);
            snapshotRef.current = null;
            setErrorMessage(null);
            return;
        }

        if (response.status === 403) {
            const data = await response.json().catch(() => ({})) as DisplayStateResponse;
            setSyncStatus('REVOKED');
            setSnapshot(null);
            snapshotRef.current = null;
            setErrorMessage(null);
            if (data.status === 'REVOKED' && data.screenId) {
                setOtpError(null);
            }
            return;
        }

        if (!response.ok) {
            if (snapshotRef.current) {
                setSyncStatus('DEGRADED');
                return;
            }

            const data = await response.json().catch(() => ({}));
            setErrorMessage(data.error ?? 'Impossible de récupérer l’état écran.');
            setSyncStatus('ERROR');
            return;
        }

        const data = await response.json() as DisplayStateResponse;
        if ('serverNow' in data) {
            syncServerClock(data.serverNow, startedAtMs, endedAtMs, serverOffsetMsRef);
        }

        if (data.status === 'PENDING') {
            setSyncStatus('PENDING');
            setSnapshot(null);
            snapshotRef.current = null;
            setErrorMessage(null);
            return;
        }

        if (data.status !== 'ACTIVE') {
            return;
        }

        setErrorMessage(null);
        const shouldReloadRuntime =
            !snapshotRef.current ||
            snapshotRef.current.revision !== data.revision ||
            snapshotRef.current.screen.channelId !== data.channelId;

        if (shouldReloadRuntime) {
            setSyncStatus('SYNCING');
            const runtimeLoaded = await loadRuntime(resolvedDeviceId);
            if (!runtimeLoaded && snapshotRef.current) {
                setSyncStatus('DEGRADED');
            }
            return;
        }

        setSyncStatus('PLAYING');
    });

    const submitOtp = React.useEffectEvent(async () => {
        if (!deviceId) return;
        if (!/^\d{6}$/.test(otpCode)) return;

        setIsSubmittingOtp(true);
        setOtpError(null);

        try {
            const response = await fetch('/api/display/pair', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    otpCode,
                    deviceId,
                    userAgent: navigator.userAgent,
                }),
            });

            if (response.status === 403) {
                setSyncStatus('REVOKED');
                return;
            }

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                if (response.status === 401 || response.status === 410) {
                    setSyncStatus('PAIRING');
                    setOtpError(data.error ?? 'Code OTP invalide.');
                    return;
                }
                setErrorMessage(data.error ?? 'Appairage impossible.');
                setSyncStatus('ERROR');
                return;
            }

            const data = await response.json() as DisplayStateResponse;
            if (data.status === 'PENDING') {
                setSyncStatus('PENDING');
                setSnapshot(null);
                snapshotRef.current = null;
                setOtpError(null);
                return;
            }

            await fetchState(deviceId);
        } catch {
            if (snapshotRef.current) {
                setSyncStatus('DEGRADED');
                return;
            }
            setErrorMessage('Erreur réseau pendant la connexion de l’écran.');
            setSyncStatus('ERROR');
        } finally {
            setIsSubmittingOtp(false);
        }
    });

    React.useEffect(() => {
        const nextDeviceId = getOrCreateDeviceId();
        setDeviceId(nextDeviceId);
        const cachedSnapshot = loadCachedSnapshot(nextDeviceId);
        if (cachedSnapshot) {
            setSnapshot(cachedSnapshot);
        }
    }, []);

    React.useEffect(() => {
        if (!deviceId) return;

        let cancelled = false;
        const synchronize = async () => {
            if (syncInFlightRef.current) {
                return;
            }

            syncInFlightRef.current = true;

            try {
                await fetchState(deviceId);
            } catch {
                if (cancelled) return;
                if (snapshotRef.current) {
                    setSyncStatus('DEGRADED');
                    return;
                }
                setErrorMessage('Erreur réseau pendant la synchronisation de l’écran.');
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

        const clockInterval = window.setInterval(() => {
            setRenderTick((current) => current + 1);
        }, 250);

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
            window.clearInterval(clockInterval);
            window.removeEventListener('online', handleOnline);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [deviceId]);

    React.useEffect(() => {
        if (!resolvedState || resolvedState.status !== 'PLAYING') {
            if (activeObjectUrlRef.current) {
                URL.revokeObjectURL(activeObjectUrlRef.current);
                activeObjectUrlRef.current = null;
            }
            setAssetSrc(null);
            return;
        }

        let cancelled = false;
        const currentAsset = resolvedState.currentItem.asset;

        const loadAsset = async () => {
            const cachedObjectUrl = await getCachedAssetObjectUrl(currentAsset);
            if (cancelled) {
                if (cachedObjectUrl) {
                    URL.revokeObjectURL(cachedObjectUrl);
                }
                return;
            }

            if (activeObjectUrlRef.current) {
                URL.revokeObjectURL(activeObjectUrlRef.current);
                activeObjectUrlRef.current = null;
            }

            if (cachedObjectUrl) {
                activeObjectUrlRef.current = cachedObjectUrl;
                setAssetSrc(cachedObjectUrl);
                return;
            }

            setAssetSrc(currentAsset.signedUrl);
        };

        void loadAsset();

        return () => {
            cancelled = true;
        };
    }, [currentAssetKey, currentSignedUrl]);

    const interruptionController = React.useMemo(
        () => createInteractiveInterruptionController({
            enabled: syncStatus === 'PLAYING' && Boolean(snapshot?.screen.interactive),
            interactiveUrl: snapshot?.screen.interactiveUrl ?? null,
            inactivityTimeoutSeconds: snapshot?.screen.inactivityTimeoutSeconds ?? null,
        }),
        [snapshot, syncStatus],
    );

    React.useEffect(() => () => {
        interruptionController.dispose();
    }, [interruptionController]);

    if (snapshot && resolvedState && ['PLAYING', 'SYNCING', 'DEGRADED'].includes(syncStatus)) {
        return (
            <main
                className="fixed inset-0 overflow-hidden bg-black"
                onPointerDown={() => interruptionController.notifyUserInteraction()}
            >
                <DisplayTemplateShell
                    snapshot={snapshot}
                    resolvedState={resolvedState}
                    syncStatus={syncStatus}
                    assetSrc={assetSrc}
                />
            </main>
        );
    }

    if (syncStatus === 'PAIRING') {
        return (
            <StatusCard
                title="Affichage Polywall"
                description="Connexion de l’écran au canal de diffusion."
                deviceId={deviceId}
            >
                <div className="grid gap-3">
                    <p>Saisissez le code à 6 chiffres de votre organisation.</p>
                    <InputOTP
                        maxLength={6}
                        value={otpCode}
                        onChange={(value) => {
                            setOtpCode(value.replace(/\D/g, ''));
                            if (otpError) setOtpError(null);
                        }}
                        inputMode="numeric"
                    >
                        <InputOTPGroup>
                            <InputOTPSlot index={0} aria-invalid={otpError !== null} />
                            <InputOTPSlot index={1} aria-invalid={otpError !== null} />
                            <InputOTPSlot index={2} aria-invalid={otpError !== null} />
                        </InputOTPGroup>
                        <InputOTPSeparator />
                        <InputOTPGroup>
                            <InputOTPSlot index={3} aria-invalid={otpError !== null} />
                            <InputOTPSlot index={4} aria-invalid={otpError !== null} />
                            <InputOTPSlot index={5} aria-invalid={otpError !== null} />
                        </InputOTPGroup>
                    </InputOTP>
                    <Button
                        type="button"
                        onClick={() => void submitOtp()}
                        disabled={!/^\d{6}$/.test(otpCode) || isSubmittingOtp}
                    >
                        Valider le code
                    </Button>
                    {otpError ? <p className="text-destructive">{otpError}</p> : null}
                </div>
            </StatusCard>
        );
    }

    if (syncStatus === 'PENDING') {
        return (
            <StatusCard
                title="Écran en attente"
                description="L’écran a été appairé mais doit encore être validé par un administrateur."
                deviceId={deviceId}
            />
        );
    }

    if (syncStatus === 'REVOKED') {
        return (
            <StatusCard
                title="Écran révoqué"
                description="Cet écran n’est plus autorisé à diffuser ce canal."
                deviceId={deviceId}
            />
        );
    }

    if (syncStatus === 'ERROR') {
        return (
            <StatusCard
                title="Erreur de diffusion"
                description={errorMessage ?? 'Une erreur a empêché le démarrage du player.'}
                deviceId={deviceId}
            />
        );
    }

    return (
        <StatusCard
            title="Synchronisation"
            description="Initialisation et récupération de la diffusion en cours."
            deviceId={deviceId}
        />
    );
}
