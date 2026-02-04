import type * as React from 'react';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { formatDate } from '@/lib/utils';

type OrganizationOverviewProps = {
    organization: {
        id: string
        name: string
        description: string
        createdAt: Date
        updatedAt: Date
        _count: {
            users: number
            screens: number
            channels: number
            playlists: number
        }
    }
    actions?: React.ReactNode
};

export function OrganizationOverview({organization, actions}: OrganizationOverviewProps) {
    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-xl font-semibold break-all max-w-120">
                        {organization.name}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Dernière mise à jour le {formatDate(organization.updatedAt)}
                    </p>
                </div>
                {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Présentation</CardTitle>
                    <CardDescription>
                        Informations principales de l&apos;organisation.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <p className="text-muted-foreground text-xs uppercase">Description</p>
                        <p className="text-sm break-all">{organization.description}</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                        <div>
                            <p className="text-muted-foreground text-xs uppercase">Créée le</p>
                            <p className="text-sm">{formatDate(organization.createdAt)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs uppercase">ID</p>
                            <p className="text-sm break-all">{organization.id}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader>
                        <CardDescription>Utilisateurs</CardDescription>
                        <CardTitle>{organization._count.users}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>Écrans</CardDescription>
                        <CardTitle>{organization._count.screens}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>Canaux</CardDescription>
                        <CardTitle>{organization._count.channels}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>Playlists</CardDescription>
                        <CardTitle>{organization._count.playlists}</CardTitle>
                    </CardHeader>
                </Card>
            </div>
        </>
    );
}
