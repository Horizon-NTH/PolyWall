import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { createActionLogger } from '@/actions/action-logging';
import { UserRole } from '@/generated/prisma/enums';
import { getStorageService } from '@/lib/storage/storage-service';

type Params = {
    params: Promise<{ mediaFileId: string }>;
};

export async function DELETE(_: Request, {params}: Params) {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({error: 'Authentification requise.'}, {status: 401});
    }

    const {mediaFileId} = await params;
    const log = createActionLogger({
        event: 'media.delete',
        action: 'delete',
        organizationId: session.user.organizationId,
        actorUserId: session.user.id,
        targetId: mediaFileId,
    });

    const mediaFile = await prisma.mediaFile.findUnique({
        where: {id: mediaFileId},
        select: {
            id: true,
            storageBucket: true,
            objectKey: true,
            mediaItemId: true,
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

    try {
        const storage = getStorageService();
        await storage.deleteObject(mediaFile.storageBucket, mediaFile.objectKey);

        await prisma.mediaFile.delete({
            where: {id: mediaFile.id},
        });

        const remaining = await prisma.mediaFile.count({
            where: {mediaItemId: mediaFile.mediaItemId},
        });

        if (remaining === 0) {
            await prisma.mediaItem.update({
                where: {id: mediaFile.mediaItemId},
                data: {
                    active: false,
                },
            });
        }

        log.success();
        return NextResponse.json({ok: true});
    } catch (error) {
        log.error(error);
        return NextResponse.json({error: 'Suppression du média impossible.'}, {status: 500});
    }
}
