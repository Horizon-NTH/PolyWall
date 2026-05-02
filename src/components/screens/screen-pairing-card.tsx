'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import {
    createScreenPairingToken,
    getActiveScreenPairingTokenState,
    revokeActiveScreenPairingToken,
} from '@/actions/screen-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type ScreenPairingCardProps = {
    organizationId: string;
};

type PersistedOtpState = {
    otpCode: string;
    expiresAt: string;
};

const OTP_REFRESH_INTERVAL_MS = 15_000;

function isOtpStillValid(expiresAt: string) {
    const timestamp = new Date(expiresAt).getTime();
    return Number.isFinite(timestamp) && timestamp > Date.now();
}

function getStorage() {
    if (typeof window === 'undefined') return null;
    const storage = window.localStorage;
    if (!storage) return null;
    if (typeof storage.getItem !== 'function') return null;
    if (typeof storage.setItem !== 'function') return null;
    if (typeof storage.removeItem !== 'function') return null;
    return storage;
}

function loadPersistedOtpState(storageKey: string): PersistedOtpState | null {
    const storage = getStorage();
    const raw = storage?.getItem(storageKey) ?? null;
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw) as PersistedOtpState;
        if (/^\d{6}$/.test(parsed.otpCode) && isOtpStillValid(parsed.expiresAt)) {
            return parsed;
        }
    } catch {
    }

    storage?.removeItem(storageKey);
    return null;
}

export function ScreenPairingCard({organizationId}: ScreenPairingCardProps) {
    const router = useRouter();
    const storageKey = React.useMemo(() => `polywall.screen.pairing-otp.${organizationId}`, [organizationId]);
    const [otpCode, setOtpCode] = React.useState('');
    const [expiresAt, setExpiresAt] = React.useState('');
    const [hasActiveTokenWithoutLocalCode, setHasActiveTokenWithoutLocalCode] = React.useState(false);
    const [isPending, startTransition] = React.useTransition();

    const clearLocalOtp = React.useCallback(() => {
        setOtpCode('');
        setExpiresAt('');
        setHasActiveTokenWithoutLocalCode(false);
        const storage = getStorage();
        storage?.removeItem(storageKey);
    }, [storageKey]);

    React.useEffect(() => {
        let cancelled = false;

        void (async () => {
            await Promise.resolve();
            if (cancelled) return;

            const persistedOtpState = loadPersistedOtpState(storageKey);

            if (cancelled) return;

            setOtpCode(persistedOtpState?.otpCode ?? '');
            setExpiresAt(persistedOtpState?.expiresAt ?? '');
            setHasActiveTokenWithoutLocalCode(false);

            startTransition(async () => {
                const result = await getActiveScreenPairingTokenState();
                if (cancelled || !result.ok) return;

                if (!result.hasActiveToken) {
                    setHasActiveTokenWithoutLocalCode(false);
                    return;
                }

                if (!persistedOtpState) {
                    setHasActiveTokenWithoutLocalCode(true);
                    if (result.expiresAt) setExpiresAt(result.expiresAt);
                } else {
                    setHasActiveTokenWithoutLocalCode(false);
                }
            });
        })();

        return () => {
            cancelled = true;
        };
    }, [organizationId, storageKey]);

    React.useEffect(() => {
        if (!otpCode || !expiresAt || !isOtpStillValid(expiresAt)) return;

        const intervalId = window.setInterval(() => {
            if (!isOtpStillValid(expiresAt)) {
                clearLocalOtp();
                return;
            }

            router.refresh();
        }, OTP_REFRESH_INTERVAL_MS);

        return () => window.clearInterval(intervalId);
    }, [clearLocalOtp, expiresAt, otpCode, router]);

    const handleGenerate = () => {
        startTransition(async () => {
            const result = await createScreenPairingToken();
            if (!result.ok) {
                toast.error(result.message);
                return;
            }

            setOtpCode(result.otpCode);
            setExpiresAt(result.expiresAt);
            setHasActiveTokenWithoutLocalCode(false);
            const storage = getStorage();
            storage?.setItem(
                storageKey,
                JSON.stringify({
                    otpCode: result.otpCode,
                    expiresAt: result.expiresAt,
                } satisfies PersistedOtpState),
            );
            toast.success('Code OTP généré.');
        });
    };

    const copy = async () => {
        if (!otpCode) return;
        try {
            await navigator.clipboard.writeText(otpCode);
            toast.success('Code copié.');
        } catch {
            toast.error('Impossible de copier le code.');
        }
    };

    const handleRevokeOtp = () => {
        startTransition(async () => {
            const result = await revokeActiveScreenPairingToken();
            if (!result.ok) {
                toast.error(result.message);
                return;
            }

            clearLocalOtp();
            toast.success('Code OTP invalidé.');
            router.refresh();
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Appairage d&apos;un écran</CardTitle>
                <CardDescription>
                    Ouvrez <code>/display</code> sur l&apos;écran puis saisissez ce code OTP à 6 chiffres.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
                <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={handleGenerate} disabled={isPending}>
                        Générer code OTP
                    </Button>
                    <Button type="button" variant="outline" onClick={copy} disabled={!otpCode}>
                        Copier
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleRevokeOtp}
                        disabled={isPending || (!otpCode && !hasActiveTokenWithoutLocalCode)}
                    >
                        Supprimer le code actif
                    </Button>
                </div>
                <Input value={otpCode} readOnly placeholder="Aucun code généré"
                       className="text-center text-lg tracking-[0.4em]" />
                {hasActiveTokenWithoutLocalCode ? (
                    <p className="text-muted-foreground text-xs">
                        Un code OTP est déjà actif côté serveur, mais n&apos;est plus disponible localement.
                        Générez un nouveau code pour le remplacer.
                    </p>
                ) : null}
                {expiresAt ? (
                    <p className="text-muted-foreground text-xs">
                        Code valide jusqu&apos;au {new Date(expiresAt).toLocaleString('fr-FR')}
                    </p>
                ) : null}
            </CardContent>
        </Card>
    );
}
