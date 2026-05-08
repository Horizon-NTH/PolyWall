import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';

type DisplayTemplateSummaryCardProps = {
    description: string;
    scope: 'global' | 'organization';
    resolution: string;
    zonesCount: number;
    widgetsCount: number;
    channelsCount: number;
    createdAt: string;
    updatedAt: string;
};

export function DisplayTemplateSummaryCard({
                                               description,
                                               scope,
                                               resolution,
                                               zonesCount,
                                               widgetsCount,
                                               channelsCount,
                                               createdAt,
                                               updatedAt,
                                           }: DisplayTemplateSummaryCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Informations</CardTitle>
                <CardDescription>Résumé du modèle et de son usage.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
                <div>
                    <p className="text-muted-foreground text-xs uppercase">Description</p>
                    <p className="break-all">{description}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                    <div>
                        <p className="text-muted-foreground text-xs uppercase">Portée</p>
                        <p>{scope === 'global' ? 'Global' : 'Organisation'}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-xs uppercase">Résolution</p>
                        <p>{resolution}</p>
                    </div>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                    <div>
                        <p className="text-muted-foreground text-xs uppercase">Zones</p>
                        <p>{zonesCount}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-xs uppercase">Widgets</p>
                        <p>{widgetsCount}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-xs uppercase">Canaux</p>
                        <p>{channelsCount}</p>
                    </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                    <div>
                        <p className="text-muted-foreground text-xs uppercase">Créé le</p>
                        <p>{formatDate(new Date(createdAt))}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-xs uppercase">Mis à jour le</p>
                        <p>{formatDate(new Date(updatedAt))}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
