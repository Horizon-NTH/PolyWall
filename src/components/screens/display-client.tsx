'use client';

import * as React from 'react';

import { DisplayPlaybackSurface } from '@/components/screens/display-playback-surface';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp';
import { getPriorityAssetDescriptors, resolveDisplayState } from '@/lib/display-runtime/runtime';
import { type DisplayRuntimeSnapshot, type DisplaySyncStatus } from '@/lib/display-runtime/types';
import {
    loadCachedSnapshot,
    saveCachedSnapshot,
    prefetchDisplayAssets,
} from '@/lib/screens/display-cache';
import { computeServerOffsetMs } from '@/lib/screens/display-clock';
import { type DisplayDebugScenario } from '@/lib/screens/display-debug';
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

type DisplayClientProps = {
    debugScenario?: DisplayDebugScenario | null;
};

export function DisplayClient(props: DisplayClientProps) {
    const [deviceId, setDeviceId] = React.useState<string | null>(null);
    const [syncStatus, setSyncStatus] = React.useState<DisplaySyncStatus>('SYNCING');
    const [snapshot, setSnapshot] = React.useState<DisplayRuntimeSnapshot | null>(null);
    const [otpCode, setOtpCode] = React.useState('');
    const [otpError, setOtpError] = React.useState<string | null>(null);
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
    const [isSubmittingOtp, setIsSubmittingOtp] = React.useState(false);
    const [serverOffsetMs, setServerOffsetMs] = React.useState(0);
    const [renderNowMs, setRenderNowMs] = React.useState(() => Date.now());
    const snapshotRef = React.useRef<DisplayRuntimeSnapshot | null>(null);
    const syncInFlightRef = React.useRef(false);
    const runtimeLoadPromiseRef = React.useRef<Promise<boolean> | null>(null);

    React.useEffect(() => {
        snapshotRef.current = snapshot;
    }, [snapshot]);

    const effectiveSyncStatus = props.debugScenario?.syncStatus ?? syncStatus;
    const effectiveSnapshot = props.debugScenario?.snapshot ?? snapshot;
    const effectiveErrorMessage = props.debugScenario?.errorMessage ?? errorMessage;
    const isDebugMode = props.debugScenario !== null && props.debugScenario !== undefined;

    React.useEffect(() => {
        const interval = window.setInterval(() => {
            setRenderNowMs(Date.now());
        }, 250);

        return () => window.clearInterval(interval);
    }, []);

    React.useEffect(() => {
        let cancelled = false;

        void (async () => {
            await Promise.resolve();
            if (cancelled) return;

            const nextDeviceId = getOrCreateDeviceId();
            const cachedSnapshot = loadCachedSnapshot(nextDeviceId);

            if (cancelled) return;

            setDeviceId(nextDeviceId);
            if (cachedSnapshot) {
                setSnapshot(cachedSnapshot);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const resolvedState = React.useMemo(
        () => (effectiveSnapshot ? resolveDisplayState(effectiveSnapshot, renderNowMs + serverOffsetMs) : null),
        [effectiveSnapshot, renderNowMs, serverOffsetMs],
    );

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
            const nextOffset = computeServerOffsetMs(nextSnapshot.serverNow, startedAtMs, endedAtMs);
            if (nextOffset !== null) {
                setServerOffsetMs(nextOffset);
            }
            saveCachedSnapshot(resolvedDeviceId, nextSnapshot);
            setSnapshot(nextSnapshot);
            setSyncStatus('PLAYING');

            const nextResolvedState = resolveDisplayState(
                nextSnapshot,
                Date.now() + (nextOffset ?? serverOffsetMs),
            );
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
            const nextOffset = computeServerOffsetMs(data.serverNow, startedAtMs, endedAtMs);
            if (nextOffset !== null) {
                setServerOffsetMs(nextOffset);
            }
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
        if (isDebugMode) return;
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
    }, [deviceId, isDebugMode]);

    const interruptionController = React.useMemo(
        () => createInteractiveInterruptionController({
            enabled: effectiveSyncStatus === 'PLAYING' && Boolean(effectiveSnapshot?.screen.interactive),
            interactiveUrl: effectiveSnapshot?.screen.interactiveUrl ?? null,
            inactivityTimeoutSeconds: effectiveSnapshot?.screen.inactivityTimeoutSeconds ?? null,
        }),
        [effectiveSnapshot, effectiveSyncStatus],
    );

    React.useEffect(() => () => {
        interruptionController.dispose();
    }, [interruptionController]);

    let content: React.ReactNode;

    if (effectiveSnapshot && resolvedState && ['PLAYING', 'SYNCING', 'DEGRADED'].includes(effectiveSyncStatus)) {
        content = (
            <main
                className="fixed inset-0 overflow-hidden bg-black"
            >
                <DisplayPlaybackSurface
                    snapshot={effectiveSnapshot}
                    syncStatus={effectiveSyncStatus}
                    serverOffsetMs={serverOffsetMs}
                    onPointerDown={() => interruptionController.notifyUserInteraction()}
                />
            </main>
        );
    } else if (effectiveSyncStatus === 'PAIRING') {
        content = (
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
                        disabled={isDebugMode || !/^\d{6}$/.test(otpCode) || isSubmittingOtp}
                    >
                        Valider le code
                    </Button>
                    {otpError ? <p className="text-destructive">{otpError}</p> : null}
                </div>
            </StatusCard>
        );
    } else if (effectiveSyncStatus === 'PENDING') {
        content = (
            <StatusCard
                title="Écran en attente"
                description="L’écran a été appairé mais doit encore être validé par un administrateur."
                deviceId={deviceId}
            />
        );
    } else if (effectiveSyncStatus === 'REVOKED') {
        content = (
            <StatusCard
                title="Écran révoqué"
                description="Cet écran n’est plus autorisé à diffuser ce canal."
                deviceId={deviceId}
            />
        );
    } else if (effectiveSyncStatus === 'ERROR') {
        content = (
            <StatusCard
                title="Erreur de diffusion"
                description={effectiveErrorMessage ?? 'Une erreur a empêché le démarrage du player.'}
                deviceId={deviceId}
            />
        );
    } else {
        content = (
            <StatusCard
                title="Synchronisation"
                description="Initialisation et récupération de la diffusion en cours."
                deviceId={deviceId}
            />
        );
    }

    return content;
}
