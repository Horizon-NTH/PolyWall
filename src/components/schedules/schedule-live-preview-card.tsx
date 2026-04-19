import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ScheduleLivePreviewCard() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Aperçu de diffusion</CardTitle>
                <CardDescription>
                    Cet espace affichera plus tard la programmation réellement diffusée sur les écrans du canal.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div
                    className="bg-muted/40 text-muted-foreground flex min-h-56 items-center justify-center rounded-md border border-dashed text-sm">
                    Bientôt disponible
                </div>
            </CardContent>
        </Card>
    );
}
