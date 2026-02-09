import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';

type ChannelSummaryCardProps = {
    description: string;
    displayTemplateName: string;
    screensCount: number;
    schedulesCount: number;
    createdAt: string;
    updatedAt: string;
};

export function ChannelSummaryCard({
                                       description,
                                       displayTemplateName,
                                       screensCount,
                                       schedulesCount,
                                       createdAt,
                                       updatedAt,
                                   }: ChannelSummaryCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Informations</CardTitle>
                <CardDescription>Résumé du canal et de son affectation.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
                <div>
                    <p className="text-muted-foreground text-xs uppercase">Description</p>
                    <p className="break-all">{description}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                    <div>
                        <p className="text-muted-foreground text-xs uppercase">Modèle d'affichage</p>
                        <p>{displayTemplateName}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-xs uppercase">Écrans rattachés</p>
                        <p>{screensCount}</p>
                    </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                    <div>
                        <p className="text-muted-foreground text-xs uppercase">Planifications</p>
                        <p>{schedulesCount}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-xs uppercase">Créé le</p>
                        <p>{formatDate(new Date(createdAt))}</p>
                    </div>
                </div>
                <div>
                    <p className="text-muted-foreground text-xs uppercase">Dernière mise à jour</p>
                    <p>{formatDate(new Date(updatedAt))}</p>
                </div>
            </CardContent>
        </Card>
    );
}
