'use client';

import * as React from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

type ErrorPageProps = {
    error: Error & { digest?: string };
    reset: () => void;
};

export default function ErrorPage({error, reset}: ErrorPageProps) {
    React.useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <main className="bg-muted/30 flex min-h-screen items-center justify-center p-6">
            <section className="w-full max-w-md space-y-6 text-center">
                <div className="space-y-2">
                    <p className="text-muted-foreground text-sm font-medium">Erreur</p>
                    <h1 className="text-3xl font-semibold tracking-tight">Une erreur est survenue</h1>
                    <p className="text-muted-foreground">
                        L&apos;application n&apos;a pas pu afficher cette page correctement.
                    </p>
                </div>
                <div className="flex flex-col justify-center gap-2 sm:flex-row">
                    <Button type="button" onClick={reset}>
                        Réessayer
                    </Button>
                    <Button asChild variant="outline">
                        <Link href="/dashboard">Tableau de bord</Link>
                    </Button>
                </div>
            </section>
        </main>
    );
}
