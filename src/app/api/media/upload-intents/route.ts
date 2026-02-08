import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { env } from '@/env';
import { UserRole } from '@/generated/prisma/enums';
import { createActionLogger } from '@/actions/action-logging';
import { uploadIntentSchema } from '@/schemas/media-api-schema';
import { isAllowedMediaMimeType, inferDefaultDurationSeconds } from '@/lib/media/media-constraints';
import { buildMediaObjectKey } from '@/lib/storage/object-key';
import { getStorageService } from '@/lib/storage/storage-service';

function inferTitleFromFileName(fileName: string) {
    const base = fileName.replace(/\.[^.]+$/, '');
    return base.replace(/[-_]+/g, ' ').trim() || 'Media';
}

async function resolveOrganizationId(
    role: UserRole,
    sessionOrganizationId: string | null,
    requestedOrganizationId?: string,
) {
    if (role === UserRole.PLATFORM_SUPER_ADMIN) {
        if (!requestedOrganizationId) return null;
        return requestedOrganizationId;
    }

    if (!sessionOrganizationId) return null;
    if (requestedOrganizationId && requestedOrganizationId !== sessionOrganizationId) {
        return null;
    }

    return sessionOrganizationId;
}

export async function POST(request: Request) {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({error: 'Authentification requise.'}, {status: 401});
    }

    const json = await request.json().catch(() => null);
    const parsed = uploadIntentSchema.safeParse(json);

    const log = createActionLogger({
        event: 'media.upload_intent',
        action: 'create',
        organizationId: session.user.organizationId,
        actorUserId: session.user.id,
    });

    if (!parsed.success) {
        log.invalid({reason: 'invalid_payload'});
        return NextResponse.json({error: 'Payload invalide.'}, {status: 400});
    }

    const data = parsed.data;
    const organizationId = await resolveOrganizationId(
        session.user.role,
        session.user.organizationId,
        data.organizationId,
    );

    if (!organizationId) {
        log.denied({reason: 'organization_missing_or_invalid'});
        return NextResponse.json(
            {error: 'Organisation invalide pour cet utilisateur.'},
            {status: 403},
        );
    }

    if (!isAllowedMediaMimeType(data.mimeType)) {
        log.invalid({reason: 'mime_not_allowed', mimeType: data.mimeType});
        return NextResponse.json({error: 'Type MIME non autorisé.'}, {status: 400});
    }

    if (data.fileSizeBytes > env.UPLOAD_MAX_BYTES) {
        log.invalid({reason: 'file_too_large', fileSizeBytes: data.fileSizeBytes});
        return NextResponse.json(
            {error: `Taille maximale dépassée (${env.UPLOAD_MAX_BYTES} octets).`},
            {status: 400},
        );
    }

    const orgExists = await prisma.organization.findUnique({
        where: {id: organizationId},
        select: {id: true},
    });

    if (!orgExists) {
        log.invalid({reason: 'organization_not_found'});
        return NextResponse.json({error: 'Organisation introuvable.'}, {status: 404});
    }

    try {
        const mediaItem =
            data.mediaItemId
                ? await prisma.mediaItem.findFirst({
                    where: {
                        id: data.mediaItemId,
                        organizationId,
                    },
                    select: {id: true, organizationId: true},
                })
                : await prisma.mediaItem.create({
                    data: {
                        organizationId,
                        title: data.title ?? inferTitleFromFileName(data.fileName),
                        description: data.description ?? '',
                        durationSeconds:
                            data.durationSeconds ?? inferDefaultDurationSeconds(data.mimeType),
                        active: true,
                    },
                    select: {id: true, organizationId: true},
                });

        if (!mediaItem) {
            log.denied({reason: 'media_item_not_found_or_forbidden'});
            return NextResponse.json({error: 'MediaItem inaccessible.'}, {status: 404});
        }

        const objectKey = buildMediaObjectKey({
            organizationId,
            mediaItemId: mediaItem.id,
            originalFileName: data.fileName,
            variant: 'original',
        });

        const createdFile = await prisma.mediaFile.create({
            data: {
                mediaItemId: mediaItem.id,
                storageBucket: env.S3_BUCKET,
                objectKey,
                originalFileName: data.fileName,
                status: 'AWAITING_UPLOAD',
                variant: 'ORIGINAL',
                variantIndex: 0,
                mimeType: data.mimeType,
                fileSizeBytes: BigInt(data.fileSizeBytes),
            },
            select: {
                id: true,
                objectKey: true,
                storageBucket: true,
            },
        });

        const storage = getStorageService();
        const uploadUrl = await storage.presignPut({
            bucket: env.S3_BUCKET,
            key: objectKey,
            contentType: data.mimeType,
            contentLength: data.fileSizeBytes,
            expiresInSeconds: env.UPLOAD_URL_TTL_SECONDS,
        });

        const expiresAt = new Date(
            Date.now() + env.UPLOAD_URL_TTL_SECONDS * 1000,
        ).toISOString();

        log.success({
            organizationId,
            targetId: createdFile.id,
            mediaItemId: mediaItem.id,
        });

        return NextResponse.json(
            {
                mediaFileId: createdFile.id,
                mediaItemId: mediaItem.id,
                storageBucket: createdFile.storageBucket,
                objectKey: createdFile.objectKey,
                uploadUrl,
                expiresAt,
            },
            {status: 201},
        );
    } catch (error) {
        log.error(error);
        return NextResponse.json({error: 'Impossible de créer l\'intention d\'upload.'}, {status: 500});
    }
}
