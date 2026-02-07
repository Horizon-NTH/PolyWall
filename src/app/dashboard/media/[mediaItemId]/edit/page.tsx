import { notFound, redirect } from 'next/navigation';

import { auth } from '@/auth';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { MediaForm } from '@/components/media/media-form';
import { OrganizationEmptyState } from '@/components/organizations/organization-empty-state';
import { defineAbilityFor } from '@/lib/casl/ability';
import { getMediaKindFromMimeType } from '@/lib/media/media-view-model';
import { prisma } from '@/lib/prisma';

type MediaEditPageProps = {
    params: Promise<{ mediaItemId: string }>
};

export default async function Page({params}: MediaEditPageProps) {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const ability = defineAbilityFor(session.user);
    if (!ability.can('update', 'MediaItem')) redirect('/dashboard');

    const {mediaItemId} = await params;
    if (!mediaItemId) {
        notFound();
    }

    const organizationId = session.user.organizationId;
    if (!organizationId) {
        const organizations = await prisma.organization.findMany({
            select: {id: true, name: true},
            orderBy: {name: 'asc'},
        });

        return (
            <>
                <DashboardHeader
                    items={[
                        {label: 'Tableau de bord', href: '/dashboard'},
                        {label: 'Médias', href: '/dashboard/media'},
                        {label: 'Modifier'},
                    ]}
                />
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <OrganizationEmptyState organizations={organizations} />
                </div>
            </>
        );
    }

    const mediaItem = await prisma.mediaItem.findFirst({
        where: {
            id: mediaItemId,
            organizationId,
        },
        select: {
            id: true,
            title: true,
            description: true,
            durationSeconds: true,
            active: true,
            files: {
                where: {variant: 'ORIGINAL'},
                select: {
                    mimeType: true,
                },
                orderBy: {createdAt: 'asc'},
            },
        },
    });

    if (!mediaItem) {
        notFound();
    }

    const primaryOriginal = mediaItem.files.at(0) ?? null;
    const mediaKind = getMediaKindFromMimeType(primaryOriginal?.mimeType ?? 'application/octet-stream');

    return (
        <>
            <DashboardHeader
                items={[
                    {label: 'Tableau de bord', href: '/dashboard'},
                    {label: 'Médias', href: '/dashboard/media'},
                    {label: mediaItem.title, href: `/dashboard/media/${mediaItem.id}`},
                    {label: 'Modifier'},
                ]}
            />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <MediaForm
                    mode="edit"
                    mediaItemId={mediaItem.id}
                    mediaKind={mediaKind}
                    cancelHref={`/dashboard/media/${mediaItem.id}`}
                    defaultValues={{
                        title: mediaItem.title,
                        description: mediaItem.description,
                        durationSeconds: mediaItem.durationSeconds,
                        active: mediaItem.active,
                    }}
                />
            </div>
        </>
    );
}
