import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { createActionLogger } from '@/actions/action-logging';
import { UserRole } from '@/generated/prisma/enums';
import { getStorageService } from '@/lib/storage/storage-service';
import { env } from '@/env';

type Params = {
    params: Promise<{ mediaFileId: string }>;
};

export async function GET(_: Request, {params}: Params) {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({error: 'Authentification requise.'}, {status: 401});
    }

    const {mediaFileId} = await params;
    const log = createActionLogger({
        event: 'media.download_url',
        action: 'change',
        organizationId: session.user.organizationId,
        actorUserId: session.user.id,
        targetId: mediaFileId,
    });

    const mediaFile = await prisma.mediaFile.findUnique({
        where: {id: mediaFileId},
        select: {
            id: true,
            status: true,
            storageBucket: true,
            objectKey: true,
            mediaItem: {
                select: {
                    organizationId: true,
                },
            },
        },
    });

    if (!mediaFile) {
        log.invalid({reason: 'media_file_not_found'});
        return NextResponse.json({error: 'MediaFile introuvable.'}, {status: 404});
    }

    const isSuperAdmin = session.user.role === UserRole.PLATFORM_SUPER_ADMIN;
    if (
        !isSuperAdmin &&
        session.user.organizationId !== mediaFile.mediaItem.organizationId
    ) {
        log.denied({reason: 'cross_organization_access'});
        return NextResponse.json({error: 'Accès refusé.'}, {status: 403});
    }

    if (mediaFile.status !== 'READY') {
        log.invalid({reason: 'media_not_ready', status: mediaFile.status});
        return NextResponse.json({error: 'Le média n\'est pas prêt.'}, {status: 409});
    }

    try {
        const storage = getStorageService();
        const downloadUrl = await storage.presignGet({
            bucket: mediaFile.storageBucket,
            key: mediaFile.objectKey,
            expiresInSeconds: env.DOWNLOAD_URL_TTL_SECONDS,
        });

        const expiresAt = new Date(
            Date.now() + env.DOWNLOAD_URL_TTL_SECONDS * 1000,
        ).toISOString();

        log.success();
        return NextResponse.json({downloadUrl, expiresAt});
    } catch (error) {
        log.error(error);
        return NextResponse.json({error: 'Impossible de générer l\'URL de téléchargement.'}, {status: 500});
    }
}
