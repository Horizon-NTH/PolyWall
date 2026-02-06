import { NextResponse } from 'next/server';
import { fileTypeFromBuffer } from 'file-type';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { createActionLogger } from '@/actions/action-logging';
import { uploadCompleteSchema } from '@/schemas/media-api-schema';
import { UserRole } from '@/generated/prisma/enums';
import { getStorageService } from '@/lib/storage/storage-service';
import { enqueueMediaProcessing } from '@/lib/queues/media-processing-queue';
import { isAllowedMediaMimeType } from '@/lib/media/media-constraints';

export async function POST(request: Request) {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({error: 'Authentification requise.'}, {status: 401});
    }

    const json = await request.json().catch(() => null);
    const parsed = uploadCompleteSchema.safeParse(json);

    const log = createActionLogger({
        event: 'media.upload_complete',
        action: 'update',
        organizationId: session.user.organizationId,
        actorUserId: session.user.id,
    });

    if (!parsed.success) {
        log.invalid({reason: 'invalid_payload'});
        return NextResponse.json({error: 'Payload invalide.'}, {status: 400});
    }

    const {mediaFileId, objectKey} = parsed.data;

    const mediaFile = await prisma.mediaFile.findUnique({
        where: {id: mediaFileId},
        select: {
            id: true,
            objectKey: true,
            storageBucket: true,
            mimeType: true,
            mediaItem: {
                select: {
                    id: true,
                    organizationId: true,
                },
            },
        },
    });

    if (!mediaFile || mediaFile.objectKey !== objectKey) {
        log.invalid({reason: 'media_file_not_found_or_key_mismatch', mediaFileId});
        return NextResponse.json({error: 'MediaFile introuvable.'}, {status: 404});
    }

    const isSuperAdmin = session.user.role === UserRole.PLATFORM_SUPER_ADMIN;
    if (
        !isSuperAdmin &&
        session.user.organizationId !== mediaFile.mediaItem.organizationId
    ) {
        log.denied({reason: 'cross_organization_access', mediaFileId});
        return NextResponse.json({error: 'Accès refusé.'}, {status: 403});
    }

    try {
        const storage = getStorageService();
        const head = await storage.headObject(mediaFile.storageBucket, mediaFile.objectKey);

        if (!head) {
            log.invalid({reason: 'object_not_found', mediaFileId});
            return NextResponse.json({error: 'Objet non trouvé dans le stockage.'}, {status: 400});
        }

        const sample = await storage.getObjectSample(
            mediaFile.storageBucket,
            mediaFile.objectKey,
            8192,
        );
        const detected = sample ? await fileTypeFromBuffer(sample) : null;
        const detectedMimeType = detected?.mime ?? null;

        if (!detectedMimeType) {
            await prisma.mediaFile.update({
                where: {id: mediaFile.id},
                data: {
                    status: 'FAILED',
                    metaJson: {
                        validation: {
                            reason: 'mime_undetectable',
                            declaredMimeType: mediaFile.mimeType,
                            headerMimeType: head.contentType,
                        },
                    },
                },
            });

            log.invalid({
                reason: 'mime_undetectable',
                mediaFileId,
                declaredMimeType: mediaFile.mimeType,
                headerMimeType: head.contentType,
            });
            return NextResponse.json(
                {error: 'Impossible de détecter de manière fiable le type du fichier.'},
                {status: 400},
            );
        }

        if (!isAllowedMediaMimeType(detectedMimeType)) {
            await prisma.mediaFile.update({
                where: {id: mediaFile.id},
                data: {
                    status: 'FAILED',
                    metaJson: {
                        validation: {
                            reason: 'mime_not_allowed',
                            detectedMimeType,
                        },
                    },
                },
            });

            log.invalid({reason: 'mime_not_allowed', mediaFileId, detectedMimeType});
            return NextResponse.json({error: 'Type MIME détecté non autorisé.'}, {status: 400});
        }

        await prisma.mediaFile.update({
            where: {id: mediaFile.id},
            data: {
                status: 'READY',
                fileSizeBytes:
                    head.contentLength !== null
                        ? BigInt(head.contentLength)
                        : undefined,
                mimeType: detectedMimeType,
                metaJson: {
                    etag: head.etag,
                    detectedMimeType,
                },
            },
        });

        await enqueueMediaProcessing({
            mediaFileId: mediaFile.id,
            organizationId: mediaFile.mediaItem.organizationId,
        });

        log.success({targetId: mediaFile.id});
        return NextResponse.json({ok: true});
    } catch (error) {
        await prisma.mediaFile.update({
            where: {id: mediaFile.id},
            data: {
                status: 'FAILED',
            },
        });

        log.error(error, {mediaFileId});
        return NextResponse.json({error: 'Validation de l\'upload impossible.'}, {status: 500});
    }
}
