import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function NotFound() {
    return (
        <main className="bg-muted/30 flex min-h-screen items-center justify-center p-6">
            <section className="w-full max-w-md space-y-6 text-center">
                <div className="space-y-2">
                    <p className="text-muted-foreground text-sm font-medium">404</p>
                    <h1 className="text-3xl font-semibold tracking-tight">Page introuvable</h1>
                    <p className="text-muted-foreground">
                        Cette page n&apos;existe pas ou n&apos;est plus disponible.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/dashboard">Retour au tableau de bord</Link>
                </Button>
            </section>
        </main>
    );
}
