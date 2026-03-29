'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp';

type DisplayState =
    | { status: 'IDLE' }
    | { status: 'NEEDS_PAIRING' }
    | { status: 'PENDING'; screenId: string }
    | {
    status: 'ACTIVE';
    screenId: string;
    channelId: string;
    interactive: boolean;
    interactiveUrl: string | null;
    inactivityTimeoutSeconds: number | null;
}
    | { status: 'REVOKED'; screenId?: string }
    | { status: 'ERROR'; message: string };

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

export function DisplayClient() {
    const [deviceId, setDeviceId] = React.useState<string | null>(null);
    const [state, setState] = React.useState<DisplayState>({status: 'IDLE'});
    const [otpCode, setOtpCode] = React.useState('');
    const [otpError, setOtpError] = React.useState<string | null>(null);
    const [isSubmittingOtp, setIsSubmittingOtp] = React.useState(false);

    const fetchState = React.useCallback(async (resolvedDeviceId: string) => {
        const response = await fetch(`/api/display/state?deviceId=${encodeURIComponent(resolvedDeviceId)}`, {
            cache: 'no-store',
        });

        if (response.status === 404) {
            setState({status: 'NEEDS_PAIRING'});
            return;
        }

        if (response.status === 403) {
            const data = await response.json().catch(() => ({}));
            setState({status: 'REVOKED', screenId: data.screenId});
            return;
        }

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            setState({status: 'ERROR', message: data.error ?? 'Impossible de récupérer l\'état écran.'});
            return;
        }

        const data = await response.json();
        if (data.status === 'ACTIVE') {
            setState({
                status: 'ACTIVE',
                screenId: data.screenId,
                channelId: data.channelId,
                interactive: data.interactive,
                interactiveUrl: data.interactiveUrl ?? null,
                inactivityTimeoutSeconds: data.inactivityTimeoutSeconds ?? null,
            });
            return;
        }

        setState({status: 'PENDING', screenId: data.screenId});
    }, []);

    const submitOtp = React.useCallback(async () => {
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
                setState({status: 'REVOKED'});
                return;
            }

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                if (response.status === 401 || response.status === 410) {
                    setState({status: 'NEEDS_PAIRING'});
                    setOtpError(data.error ?? 'Code OTP invalide.');
                    return;
                }
                setState({status: 'ERROR', message: data.error ?? 'Appairage impossible.'});
                return;
            }

            const data = await response.json();
            if (data.status === 'ACTIVE') {
                setState({
                    status: 'ACTIVE',
                    screenId: data.screenId,
                    channelId: data.channelId,
                    interactive: data.interactive,
                    interactiveUrl: data.interactiveUrl ?? null,
                    inactivityTimeoutSeconds: data.inactivityTimeoutSeconds ?? null,
                });
                setOtpError(null);
                return;
            }

            setState({status: 'PENDING', screenId: data.screenId});
            setOtpError(null);
        } catch {
            setState({status: 'ERROR', message: 'Erreur réseau pendant la connexion de l\'écran.'});
        } finally {
            setIsSubmittingOtp(false);
        }
    }, [deviceId, otpCode]);

    React.useEffect(() => {
        const id = getOrCreateDeviceId();
        setDeviceId(id);
    }, []);

    React.useEffect(() => {
        if (!deviceId) return;

        let cancelled = false;
        const initialize = async () => {
            try {
                await fetchState(deviceId);
            } catch {
                if (!cancelled) {
                    setState({status: 'ERROR', message: 'Erreur réseau pendant la connexion de l\'écran.'});
                }
            }
        };

        void initialize();

        const interval = window.setInterval(() => {
            if (state.status === 'NEEDS_PAIRING') return;
            void fetchState(deviceId);
        }, 15000);

        return () => {
            cancelled = true;
            window.clearInterval(interval);
        };
    }, [deviceId, fetchState, state.status]);

    return (
        <main className="bg-muted/30 flex min-h-screen items-center justify-center p-6">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle>Affichage Polywall</CardTitle>
                    <CardDescription>Connexion de l&apos;écran au canal de diffusion.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    {state.status === 'IDLE' ? <p>Initialisation en cours...</p> : null}
                    {state.status === 'NEEDS_PAIRING' ? (
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
                    ) : null}
                    {state.status === 'PENDING' ? (
                        <p>Écran en attente de validation par un administrateur.</p>
                    ) : null}
                    {state.status === 'REVOKED' ? (
                        <p>Cet écran est révoqué. Contactez un administrateur.</p>
                    ) : null}
                    {state.status === 'ERROR' ? <p className="text-destructive">{state.message}</p> : null}
                    {state.status === 'ACTIVE' ? (
                        <div className="space-y-2">
                            <p className="font-medium">Écran actif</p>
                            <p>Canal: {state.channelId}</p>
                            <p>Interactif: {state.interactive ? 'Oui' : 'Non'}</p>
                            <p>URL interactive: {state.interactiveUrl ?? 'Aucune'}</p>
                            <p>
                                Timeout
                                inactivité: {state.inactivityTimeoutSeconds ? `${state.inactivityTimeoutSeconds}s` : 'Non défini'}
                            </p>
                            <p className="text-muted-foreground">Mode affichage canal: placeholder V1.</p>
                        </div>
                    ) : null}
                    <p className="text-muted-foreground pt-2 text-xs">ID appareil: {deviceId ?? '...'}</p>
                </CardContent>
            </Card>
        </main>
    );
}
