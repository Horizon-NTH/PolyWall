import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, formatDurationSeconds } from '@/lib/utils';

type PlaylistSummaryCardProps = {
    description: string;
    mediaCount: number;
    totalDurationSeconds: number;
    inactiveMediaCount: number;
    createdAt: string;
    updatedAt: string;
};

export function PlaylistSummaryCard({
                                        description,
                                        mediaCount,
                                        totalDurationSeconds,
                                        inactiveMediaCount,
                                        createdAt,
                                        updatedAt,
                                    }: PlaylistSummaryCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Informations</CardTitle>
                <CardDescription>Résumé de la playlist et de sa timeline.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
                <div>
                    <p className="text-muted-foreground text-xs uppercase">Description</p>
                    <p className="break-all">{description}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                    <div>
                        <p className="text-muted-foreground text-xs uppercase">Médias</p>
                        <p>{mediaCount}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-xs uppercase">Durée diffusable</p>
                        <p>{formatDurationSeconds(totalDurationSeconds)}</p>
                    </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                    <div>
                        <p className="text-muted-foreground text-xs uppercase">Médias inactifs</p>
                        <p className={inactiveMediaCount > 0 ? 'text-amber-700' : 'text-emerald-600'}>
                            {inactiveMediaCount}
                        </p>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-xs uppercase">Créée le</p>
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
