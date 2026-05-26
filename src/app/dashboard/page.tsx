import Link from 'next/link';
import {
    AlertTriangle,
    CalendarClock,
    Image as ImageIcon,
    ListMusic,
    Monitor,
    Plus,
    Radio,
} from 'lucide-react';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { OrganizationEmptyState } from '@/components/organizations/organization-empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyTitle,
} from '@/components/ui/empty';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { defineAbilityFor } from '@/lib/casl/ability';
import {
    getOrganizationDashboardOverview,
    getPlatformDashboardOverview,
} from '@/lib/dashboard/dashboard-overview';
import { prisma } from '@/lib/prisma';
import { appendReturnTo } from '@/lib/return-to';
import { SCHEDULE_TYPE_LABELS } from '@/lib/schedules/schedule-utils';
import { formatDate } from '@/lib/utils';

const DASHBOARD_HREF = '/dashboard';

function withDashboardReturnTo(href: string) {
    return appendReturnTo(href, DASHBOARD_HREF);
}

type StatCardProps = {
    title: string;
    value: number;
    description: string;
};

function StatCard({title, value, description}: StatCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-3xl font-semibold tabular-nums">{value}</p>
            </CardContent>
        </Card>
    );
}

function EmptyCard({
                       title,
                       description,
                   }: {
    title: string;
    description: string;
}) {
    return (
        <Empty className="min-h-64">
            <EmptyHeader>
                <EmptyTitle>{title}</EmptyTitle>
                <EmptyDescription>{description}</EmptyDescription>
            </EmptyHeader>
        </Empty>
    );
}

function QuickActions({
                          canCreateMedia,
                          canCreatePlaylist,
                          canCreateSchedule,
                          canCreateChannel,
                          canCreateScreen,
                      }: {
    canCreateMedia: boolean;
    canCreatePlaylist: boolean;
    canCreateSchedule: boolean;
    canCreateChannel: boolean;
    canCreateScreen: boolean;
}) {
    const actions = [
        canCreateMedia
            ? {href: withDashboardReturnTo('/dashboard/media/new'), label: 'Ajouter un média', icon: ImageIcon}
            : null,
        canCreatePlaylist
            ? {href: withDashboardReturnTo('/dashboard/playlists/new'), label: 'Créer une playlist', icon: ListMusic}
            : null,
        canCreateSchedule
            ? {href: withDashboardReturnTo('/dashboard/schedules/new'), label: 'Programmer', icon: CalendarClock}
            : null,
        canCreateChannel
            ? {href: withDashboardReturnTo('/dashboard/channels/new'), label: 'Créer un canal', icon: Radio}
            : null,
        canCreateScreen
            ? {href: '/dashboard/screens', label: 'Appairer un écran', icon: Monitor}
            : null,
    ].filter((action) => action !== null);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Actions rapides</CardTitle>
                <CardDescription>Accès direct aux opérations courantes.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
                {actions.length > 0 ? actions.map((action) => {
                    const Icon = action.icon;
                    return (
                        <Button key={action.href} asChild variant="outline" className="justify-start">
                            <Link href={action.href}>
                                <Icon data-icon="inline-start" />
                                {action.label}
                            </Link>
                        </Button>
                    );
                }) : (
                    <p className="text-muted-foreground text-sm">Aucune action disponible pour ce rôle.</p>
                )}
            </CardContent>
        </Card>
    );
}

function PlatformDashboard({overview}: { overview: Awaited<ReturnType<typeof getPlatformDashboardOverview>> }) {
    return (
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard title="Entités" value={overview.organizationsCount} description="Organisations créées" />
                <StatCard title="Utilisateurs" value={overview.usersCount} description="Comptes administrés" />
                <StatCard title="Canaux" value={overview.channelsCount} description="Flux de diffusion" />
                <StatCard title="Écrans" value={overview.screensCount} description="Terminaux enregistrés" />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
                <Card>
                    <CardHeader>
                        <CardTitle>Entités récentes</CardTitle>
                        <CardDescription>Sélectionnez une entité pour consulter son exploitation.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {overview.recentOrganizations.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Entité</TableHead>
                                        <TableHead>Canaux</TableHead>
                                        <TableHead>Écrans</TableHead>
                                        <TableHead>Utilisateurs</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {overview.recentOrganizations.map((organization) => (
                                        <TableRow key={organization.id}>
                                            <TableCell>
                                                <Link
                                                    href={withDashboardReturnTo(`/dashboard/organizations/${organization.id}`)}
                                                    className="font-medium underline-offset-4 hover:underline"
                                                >
                                                    {organization.name}
                                                </Link>
                                            </TableCell>
                                            <TableCell>{organization._count.channels}</TableCell>
                                            <TableCell>{organization._count.screens}</TableCell>
                                            <TableCell>{organization._count.users}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <EmptyCard
                                title="Aucune entité"
                                description="Créez une première entité pour démarrer l'exploitation."
                            />
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Plateforme</CardTitle>
                        <CardDescription>Vue globale hors entité sélectionnée.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Médias</span>
                            <span className="font-medium tabular-nums">{overview.mediaItemsCount}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Playlists</span>
                            <span className="font-medium tabular-nums">{overview.playlistsCount}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function ChannelStatusBadge({hasIssue}: { hasIssue: boolean }) {
    return hasIssue ? (
        <Badge variant="destructive">À traiter</Badge>
    ) : (
        <Badge variant="secondary">OK</Badge>
    );
}

function OrganizationDashboard({
                                   overview,
                                   canCreateMedia,
                                   canCreatePlaylist,
                                   canCreateSchedule,
                                   canCreateChannel,
                                   canCreateScreen,
                               }: {
    overview: Awaited<ReturnType<typeof getOrganizationDashboardOverview>>;
    canCreateMedia: boolean;
    canCreatePlaylist: boolean;
    canCreateSchedule: boolean;
    canCreateChannel: boolean;
    canCreateScreen: boolean;
}) {
    const alertItems = [
        overview.stats.pendingScreens > 0
            ? {
                href: '/dashboard/screens?status=PENDING',
                title: `${overview.stats.pendingScreens} écran${overview.stats.pendingScreens > 1 ? 's' : ''} en attente`,
                description: 'Validation administrateur requise.',
            }
            : null,
        overview.stats.failedMediaFiles > 0
            ? {
                href: '/dashboard/media?status=failed',
                title: `${overview.stats.failedMediaFiles} fichier${overview.stats.failedMediaFiles > 1 ? 's' : ''} média en échec`,
                description: 'Relance ou suppression à prévoir.',
            }
            : null,
        overview.channelsWithoutDefaultCount > 0
            ? {
                href: '/dashboard/schedules',
                title: `${overview.channelsWithoutDefaultCount} canal${overview.channelsWithoutDefaultCount > 1 ? 'aux' : ''} sans playlist par défaut`,
                description: 'Risque de diffusion indisponible hors programmation.',
            }
            : null,
        overview.emptyActiveSchedules.length > 0
            ? {
                href: '/dashboard/schedules',
                title: `${overview.emptyActiveSchedules.length} programmation${overview.emptyActiveSchedules.length > 1 ? 's' : ''} avec playlist vide`,
                description: 'Aucun média ne sera diffusé pour ces créneaux.',
            }
            : null,
    ].filter((item) => item !== null);

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="Écrans actifs"
                    value={overview.stats.activeScreens}
                    description={`${overview.stats.pendingScreens} en attente, ${overview.stats.revokedScreens} révoqué${overview.stats.revokedScreens > 1 ? 's' : ''}`}
                />
                <StatCard
                    title="Canaux"
                    value={overview.stats.channels}
                    description={`${overview.stats.activeSchedules} programmation${overview.stats.activeSchedules > 1 ? 's' : ''} active${overview.stats.activeSchedules > 1 ? 's' : ''}`}
                />
                <StatCard
                    title="Médias prêts"
                    value={overview.stats.readyMediaFiles}
                    description={`${overview.stats.processingMediaFiles} en traitement`}
                />
                <StatCard
                    title="Playlists"
                    value={overview.stats.playlists}
                    description="Bibliothèque de diffusion"
                />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
                <Card>
                    <CardHeader>
                        <CardTitle>État des canaux</CardTitle>
                        <CardDescription>Diffusion courante et points de vigilance par canal.</CardDescription>
                        <CardAction>
                            <Button asChild variant="outline" size="sm">
                                <Link href="/dashboard/channels">Voir tout</Link>
                            </Button>
                        </CardAction>
                    </CardHeader>
                    <CardContent>
                        {overview.channels.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Canal</TableHead>
                                        <TableHead>Diffusion actuelle</TableHead>
                                        <TableHead>Écrans</TableHead>
                                        <TableHead>Modèle</TableHead>
                                        <TableHead>Statut</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {overview.channels.map((channel) => {
                                        const hasIssue =
                                            !channel.hasActiveDefaultSchedule ||
                                            !channel.currentSchedule ||
                                            channel.currentSchedule.playlistItemsCount === 0;

                                        return (
                                            <TableRow key={channel.id}>
                                                <TableCell>
                                                    <Link
                                                        href={withDashboardReturnTo(`/dashboard/channels/${channel.id}`)}
                                                        className="font-medium underline-offset-4 hover:underline"
                                                    >
                                                        {channel.name}
                                                    </Link>
                                                </TableCell>
                                                <TableCell>
                                                    {channel.currentSchedule ? (
                                                        <div className="flex flex-col gap-1">
                                                            <span>{channel.currentSchedule.playlistName}</span>
                                                            <span className="text-muted-foreground text-xs">
                                                                {SCHEDULE_TYPE_LABELS[channel.currentSchedule.type]}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">Aucune diffusion</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>{channel.screensCount}</TableCell>
                                                <TableCell>{channel.displayTemplateName}</TableCell>
                                                <TableCell>
                                                    <ChannelStatusBadge hasIssue={hasIssue} />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        ) : (
                            <Empty>
                                <EmptyHeader>
                                    <EmptyTitle>Aucun canal</EmptyTitle>
                                    <EmptyDescription>
                                        Créez un canal pour commencer à diffuser une playlist.
                                    </EmptyDescription>
                                </EmptyHeader>
                                {canCreateChannel ? (
                                    <EmptyContent>
                                        <Button asChild>
                                            <Link href={withDashboardReturnTo('/dashboard/channels/new')}>
                                                <Plus data-icon="inline-start" />
                                                Créer un canal
                                            </Link>
                                        </Button>
                                    </EmptyContent>
                                ) : null}
                            </Empty>
                        )}
                    </CardContent>
                </Card>

                <div className="flex flex-col gap-4">
                    <QuickActions
                        canCreateMedia={canCreateMedia}
                        canCreatePlaylist={canCreatePlaylist}
                        canCreateSchedule={canCreateSchedule}
                        canCreateChannel={canCreateChannel}
                        canCreateScreen={canCreateScreen}
                    />

                    <Card>
                        <CardHeader>
                            <CardTitle>À traiter</CardTitle>
                            <CardDescription>Alertes qui peuvent bloquer ou dégrader la diffusion.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3">
                            {alertItems.length > 0 ? alertItems.map((item) => (
                                <Link
                                    key={item.title}
                                    href={item.href}
                                    className="flex items-start gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50"
                                >
                                    <AlertTriangle className="mt-0.5" aria-hidden="true" />
                                    <span className="min-w-0">
                                        <span className="block font-medium">{item.title}</span>
                                        <span className="text-muted-foreground block text-sm">{item.description}</span>
                                    </span>
                                </Link>
                            )) : (
                                <p className="text-muted-foreground text-sm">
                                    Aucun point bloquant détecté pour cette entité.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Écrans en attente</CardTitle>
                        <CardDescription>Derniers écrans appairés à valider.</CardDescription>
                        <CardAction>
                            <Button asChild variant="outline" size="sm">
                                <Link href="/dashboard/screens">Écrans</Link>
                            </Button>
                        </CardAction>
                    </CardHeader>
                    <CardContent>
                        {overview.pendingScreens.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Écran</TableHead>
                                        <TableHead>Lieu</TableHead>
                                        <TableHead>Dernière mise à jour</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {overview.pendingScreens.map((screen) => (
                                        <TableRow key={screen.id}>
                                            <TableCell>
                                                <Link
                                                    href={withDashboardReturnTo(`/dashboard/screens/${screen.id}/edit`)}
                                                    className="font-medium underline-offset-4 hover:underline"
                                                >
                                                    {screen.name}
                                                </Link>
                                            </TableCell>
                                            <TableCell>{screen.location}</TableCell>
                                            <TableCell>{formatDate(screen.updatedAt)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <p className="text-muted-foreground text-sm">Aucun écran en attente.</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Activité média</CardTitle>
                        <CardDescription>Derniers médias modifiés dans l&apos;entité.</CardDescription>
                        <CardAction>
                            <Button asChild variant="outline" size="sm">
                                <Link href="/dashboard/media">Médias</Link>
                            </Button>
                        </CardAction>
                    </CardHeader>
                    <CardContent>
                        {overview.recentMediaItems.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Média</TableHead>
                                        <TableHead>État</TableHead>
                                        <TableHead>Modification</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {overview.recentMediaItems.map((mediaItem) => {
                                        const file = mediaItem.files[0];
                                        return (
                                            <TableRow key={mediaItem.id}>
                                                <TableCell>
                                                    <Link
                                                        href={withDashboardReturnTo(`/dashboard/media/${mediaItem.id}`)}
                                                        className="font-medium underline-offset-4 hover:underline"
                                                    >
                                                        {mediaItem.title}
                                                    </Link>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={file?.status === 'FAILED' ? 'destructive' : 'secondary'}
                                                    >
                                                        {file?.status ?? 'N/A'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{formatDate(mediaItem.updatedAt)}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        ) : (
                            <p className="text-muted-foreground text-sm">Aucun média dans cette entité.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default async function Page() {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    const organizationId = session.user.organizationId;

    if (!organizationId) {
        if (ability.can('view', 'SuperAdminSection')) {
            const overview = await getPlatformDashboardOverview();
            return (
                <>
                    <DashboardHeader items={[{label: 'Tableau de bord'}]} />
                    <PlatformDashboard overview={overview} />
                </>
            );
        }

        const organizations = await prisma.organization.findMany({
            select: {id: true, name: true},
            orderBy: {name: 'asc'},
        });

        return (
            <>
                <DashboardHeader items={[{label: 'Tableau de bord'}]} />
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <OrganizationEmptyState organizations={organizations} />
                </div>
            </>
        );
    }

    const overview = await getOrganizationDashboardOverview(organizationId);

    return (
        <>
            <DashboardHeader items={[{label: 'Tableau de bord'}]} />
            <OrganizationDashboard
                overview={overview}
                canCreateMedia={ability.can('create', 'MediaItem')}
                canCreatePlaylist={ability.can('create', 'Playlist')}
                canCreateSchedule={ability.can('create', 'PlaylistSchedule')}
                canCreateChannel={ability.can('create', 'Channel')}
                canCreateScreen={ability.can('create', 'Screen')}
            />
        </>
    );
}
