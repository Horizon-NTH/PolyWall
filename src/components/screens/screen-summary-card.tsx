import { ScreenStatus } from '@/generated/prisma/enums';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';

const statusLabel: Record<ScreenStatus, string> = {
    PENDING: 'En attente',
    ACTIVE: 'Actif',
    REVOKED: 'Révoqué',
};

type ScreenSummaryCardProps = {
    status: ScreenStatus;
    deviceId: string;
    location: string;
    channelName: string | null;
    interactive: boolean;
    interactiveUrl: string | null;
    inactivityTimeoutSeconds: number | null;
    createdAt: string;
    updatedAt: string;
    approvedAt: string | null;
    revokedAt: string | null;
    lastSeenAt: string | null;
};

type SummaryItemProps = {
    label: string;
    value: string;
    breakAll?: boolean;
    fullWidth?: boolean;
};

function SummaryItem({label, value, breakAll = false, fullWidth = false}: SummaryItemProps) {
    return (
        <div className={fullWidth ? 'md:col-span-2' : undefined}>
            <p className="text-muted-foreground text-xs uppercase">{label}</p>
            <p className={breakAll ? 'break-all' : undefined}>{value}</p>
        </div>
    );
}

export function ScreenSummaryCard(props: ScreenSummaryCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Informations</CardTitle>
                <CardDescription>Résumé de l&apos;écran et de sa configuration.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 text-sm">
                <div className="grid gap-4 md:grid-cols-2">
                    <SummaryItem label="Statut" value={statusLabel[props.status]} />
                    <SummaryItem label="Canal" value={props.channelName ?? 'Aucun'} />
                    <SummaryItem label="Localisation" value={props.location} />
                    <SummaryItem label="Device ID" value={props.deviceId} breakAll />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <SummaryItem label="Interactif" value={props.interactive ? 'Oui' : 'Non'} />
                    <SummaryItem
                        label="Timeout inactivité"
                        value={props.inactivityTimeoutSeconds ? `${props.inactivityTimeoutSeconds}s` : 'Non défini'}
                    />
                    <SummaryItem
                        label="URL interactive"
                        value={props.interactiveUrl ?? 'Aucune'}
                        breakAll
                        fullWidth
                    />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <SummaryItem
                        label="Dernière activité"
                        value={props.lastSeenAt ? formatDate(new Date(props.lastSeenAt)) : 'Inconnue'}
                    />
                    <SummaryItem
                        label="Validé le"
                        value={props.approvedAt ? formatDate(new Date(props.approvedAt)) : 'Non validé'}
                    />
                    <SummaryItem
                        label="Révoqué le"
                        value={props.revokedAt ? formatDate(new Date(props.revokedAt)) : 'Non'}
                    />
                    <SummaryItem label="Mis à jour le" value={formatDate(new Date(props.updatedAt))} />
                    <SummaryItem label="Créé le" value={formatDate(new Date(props.createdAt))} />
                </div>
            </CardContent>
        </Card>
    );
}
