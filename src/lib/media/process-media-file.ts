import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { UnrecoverableError } from 'bullmq';
import { $ } from 'execa';
import sharp from 'sharp';
import { MEDIA_PROCESSING_VERSION } from '@/lib/media/processing-version';
import { isPresentationMimeType, resolveSourceExtension } from '@/lib/media/media-constraints';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { buildDerivedMediaObjectKey } from '@/lib/storage/object-key';
import { getStorageService } from '@/lib/storage/storage-service';

export type MediaProcessingJobData = {
    mediaFileId: string;
    organizationId: string;
};

type MetadataPatch = {
    detectedMimeType?: string;
    width?: number;
    height?: number;
    durationSeconds?: number;
    pageCount?: number;
    slideCount?: number;
    codec?: string;
    etag?: string | null;
    sizeBytesActual?: number;
};

const EXECA_MAX_BUFFER = 10 * 1024 * 1024;
const runBinary = $({maxBuffer: EXECA_MAX_BUFFER});
type ImageEncoding = {
    extension: 'webp' | 'jpg';
    mimeType: 'image/webp' | 'image/jpeg';
};
let imageEncodingPromise: Promise<ImageEncoding> | null = null;

export async function processMediaFile(job: MediaProcessingJobData) {
    const startedAt = Date.now();
    const mediaFile = await prisma.mediaFile.findUnique({
        where: {id: job.mediaFileId},
        select: {
            id: true,
            status: true,
            metaJson: true,
            mimeType: true,
            originalFileName: true,
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
        logger.warn(
            {event: 'media.processing', mediaFileId: job.mediaFileId},
            'Media file not found.',
        );
        return;
    }

    if (mediaFile.mediaItem.organizationId !== job.organizationId) {
        throw new UnrecoverableError('Job organization does not match media organization.');
    }

    const keyPrefix = `org/${job.organizationId}/`;
    if (!mediaFile.objectKey.startsWith(keyPrefix)) {
        throw new UnrecoverableError('Object key is not scoped to job organization.');
    }

    if (mediaFile.status === 'READY') {
        logger.info(
            {event: 'media.processing.skip', mediaFileId: mediaFile.id, status: mediaFile.status},
            'Media file already processed.',
        );
        return;
    }

    if (mediaFile.status !== 'UPLOADED') {
        throw new UnrecoverableError(`Media file is not processable from status ${mediaFile.status}.`);
    }

    const lockResult = await prisma.mediaFile.updateMany({
        where: {
            id: mediaFile.id,
            status: 'UPLOADED',
        },
        data: {
            status: 'PROCESSING',
        },
    });

    if (lockResult.count === 0) {
        logger.info(
            {event: 'media.processing.lock.skipped', mediaFileId: mediaFile.id},
            'Media file lock skipped.',
        );
        return;
    }

    const storage = getStorageService();
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `polywall-media-${mediaFile.id}-`));
    const sourcePath = path.join(
        tempDir,
        `${mediaFile.id}${resolveSourceExtension(mediaFile.mimeType, mediaFile.originalFileName)}`,
    );
    const metadata: MetadataPatch = {detectedMimeType: mediaFile.mimeType};
    const currentMeta = asRecord(mediaFile.metaJson);

    try {
        const head = await storage.headObject(mediaFile.storageBucket, mediaFile.objectKey);
        if (!head) {
            throw new UnrecoverableError('Object not found in storage.');
        }
        metadata.etag = head.etag;
        metadata.sizeBytesActual = head.contentLength ?? undefined;

        await storage.getObjectToFile({
            bucket: mediaFile.storageBucket,
            key: mediaFile.objectKey,
            filePath: sourcePath,
        });

        if (mediaFile.mimeType.startsWith('image/')) {
            const imageEncoding = await getImageEncoding();
            const imageMeta = await probeImage(sourcePath);
            metadata.width = imageMeta.width;
            metadata.height = imageMeta.height;

            const thumbPath = path.join(tempDir, `thumb.${imageEncoding.extension}`);
            await renderImageThumb(sourcePath, thumbPath, imageEncoding);
            await upsertDerived({
                sourceFileId: mediaFile.id,
                mediaItemId: mediaFile.mediaItemId,
                organizationId: mediaFile.mediaItem.organizationId,
                storageBucket: mediaFile.storageBucket,
                localFilePath: thumbPath,
                variant: 'THUMB',
                variantIndex: 0,
                originalFileName: `thumb.${imageEncoding.extension}`,
                mimeType: imageEncoding.mimeType,
            });
        } else if (mediaFile.mimeType.startsWith('video/')) {
            const imageEncoding = await getImageEncoding();
            const videoMeta = await probeMedia(sourcePath);
            metadata.width = videoMeta.width;
            metadata.height = videoMeta.height;
            metadata.durationSeconds = videoMeta.durationSeconds;
            metadata.codec = videoMeta.codec;

            const thumbPath = path.join(tempDir, `thumb.${imageEncoding.extension}`);
            await renderVideoThumb(sourcePath, thumbPath, imageEncoding);
            await upsertDerived({
                sourceFileId: mediaFile.id,
                mediaItemId: mediaFile.mediaItemId,
                organizationId: mediaFile.mediaItem.organizationId,
                storageBucket: mediaFile.storageBucket,
                localFilePath: thumbPath,
                variant: 'THUMB',
                variantIndex: 0,
                originalFileName: `thumb.${imageEncoding.extension}`,
                mimeType: imageEncoding.mimeType,
            });

            if (metadata.durationSeconds && metadata.durationSeconds > 0) {
                await prisma.mediaItem.update({
                    where: {id: mediaFile.mediaItemId},
                    data: {durationSeconds: Math.max(1, Math.round(metadata.durationSeconds))},
                });
            }
        } else if (mediaFile.mimeType === 'application/pdf') {
            const imageEncoding = await getImageEncoding();
            const renderDir = path.join(tempDir, 'render');
            await fs.mkdir(renderDir, {recursive: true});
            const pageCount = await countPdfPages(sourcePath);
            metadata.pageCount = pageCount;
            const rendered = await renderPdfPages(sourcePath, renderDir, pageCount, imageEncoding);

            for (const item of rendered) {
                await upsertDerived({
                    sourceFileId: mediaFile.id,
                    mediaItemId: mediaFile.mediaItemId,
                    organizationId: mediaFile.mediaItem.organizationId,
                    storageBucket: mediaFile.storageBucket,
                    localFilePath: item.filePath,
                    variant: 'RENDER',
                    variantIndex: item.index,
                    originalFileName: `page-${item.index}.${imageEncoding.extension}`,
                    mimeType: imageEncoding.mimeType,
                });
            }

            if (rendered[0]) {
                const thumbPath = path.join(tempDir, `thumb.${imageEncoding.extension}`);
                await renderImageThumb(rendered[0].filePath, thumbPath, imageEncoding);
                await upsertDerived({
                    sourceFileId: mediaFile.id,
                    mediaItemId: mediaFile.mediaItemId,
                    organizationId: mediaFile.mediaItem.organizationId,
                    storageBucket: mediaFile.storageBucket,
                    localFilePath: thumbPath,
                    variant: 'THUMB',
                    variantIndex: 0,
                    originalFileName: `thumb.${imageEncoding.extension}`,
                    mimeType: imageEncoding.mimeType,
                });
            }
        } else if (isPresentationMimeType(mediaFile.mimeType)) {
            const imageEncoding = await getImageEncoding();
            const pdfPath = await convertPresentationToPdf(sourcePath, tempDir);
            const renderDir = path.join(tempDir, 'render');
            await fs.mkdir(renderDir, {recursive: true});
            const slideCount = await countPdfPages(pdfPath);
            metadata.slideCount = slideCount;
            const rendered = await renderPdfPages(pdfPath, renderDir, slideCount, imageEncoding);

            for (const item of rendered) {
                await upsertDerived({
                    sourceFileId: mediaFile.id,
                    mediaItemId: mediaFile.mediaItemId,
                    organizationId: mediaFile.mediaItem.organizationId,
                    storageBucket: mediaFile.storageBucket,
                    localFilePath: item.filePath,
                    variant: 'RENDER',
                    variantIndex: item.index,
                    originalFileName: `slide-${item.index}.${imageEncoding.extension}`,
                    mimeType: imageEncoding.mimeType,
                });
            }

            if (rendered[0]) {
                const thumbPath = path.join(tempDir, `thumb.${imageEncoding.extension}`);
                await renderImageThumb(rendered[0].filePath, thumbPath, imageEncoding);
                await upsertDerived({
                    sourceFileId: mediaFile.id,
                    mediaItemId: mediaFile.mediaItemId,
                    organizationId: mediaFile.mediaItem.organizationId,
                    storageBucket: mediaFile.storageBucket,
                    localFilePath: thumbPath,
                    variant: 'THUMB',
                    variantIndex: 0,
                    originalFileName: `thumb.${imageEncoding.extension}`,
                    mimeType: imageEncoding.mimeType,
                });
            }
        } else {
            throw new UnrecoverableError(`Unsupported mime type for processing: ${mediaFile.mimeType}`);
        }

        await prisma.mediaFile.update({
            where: {id: mediaFile.id},
            data: {
                status: 'READY',
                metaJson: {
                    ...currentMeta,
                    ...metadata,
                    processing: {
                        status: 'READY',
                        processedAt: new Date().toISOString(),
                        processingVersion: MEDIA_PROCESSING_VERSION,
                        durationMs: Date.now() - startedAt,
                    },
                },
            },
        });
    } catch (error) {
        const unrecoverable = error instanceof UnrecoverableError;
        const nextStatus = unrecoverable ? 'FAILED' : 'UPLOADED';

        await prisma.mediaFile.update({
            where: {id: mediaFile.id},
            data: {
                status: nextStatus,
                metaJson: {
                    ...currentMeta,
                    ...metadata,
                    processing: {
                        status: unrecoverable ? 'FAILED' : 'RETRY_PENDING',
                        processedAt: new Date().toISOString(),
                        processingVersion: MEDIA_PROCESSING_VERSION,
                        durationMs: Date.now() - startedAt,
                        error: {
                            message: error instanceof Error ? error.message : String(error),
                            kind: unrecoverable ? 'functional' : 'transient',
                        },
                    },
                },
            },
        });
        throw error;
    } finally {
        await fs.rm(tempDir, {recursive: true, force: true});
    }
}

function asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return {};
    }
    return value as Record<string, unknown>;
}

async function probeMedia(filePath: string) {
    const {stdout} = await runBinary`ffprobe -v error -print_format json -show_streams -show_format ${filePath}`;

    const data = JSON.parse(stdout) as {
        streams?: Array<{
            codec_type?: string;
            width?: number;
            height?: number;
            codec_name?: string;
            duration?: string;
        }>;
        format?: {
            duration?: string;
        };
    };

    const videoStream = data.streams?.find((stream) => stream.codec_type === 'video');
    const durationRaw = videoStream?.duration ?? data.format?.duration;
    const durationSeconds = durationRaw ? Number.parseFloat(durationRaw) : undefined;

    return {
        width: videoStream?.width,
        height: videoStream?.height,
        codec: videoStream?.codec_name,
        durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : undefined,
    };
}

async function probeImage(filePath: string) {
    const metadata = await sharp(filePath, {animated: true}).metadata();
    return {
        width: metadata.width,
        height: metadata.height,
    };
}

async function getImageEncoding(): Promise<ImageEncoding> {
    if (!imageEncodingPromise) {
        imageEncodingPromise = detectImageEncoding();
    }
    return imageEncodingPromise;
}

async function detectImageEncoding(): Promise<ImageEncoding> {
    try {
        const {stdout} = await runBinary`ffmpeg -hide_banner -encoders`;
        if (/\blibwebp\b/.test(stdout)) {
            return {extension: 'webp', mimeType: 'image/webp'};
        }
    } catch (error) {
        logger.warn(
            {event: 'media.processing.ffmpeg.encoder.probe_failed', error},
            'Failed to probe ffmpeg encoders. Falling back to JPEG.',
        );
    }
    logger.warn(
        {event: 'media.processing.ffmpeg.encoder.fallback', encoder: 'mjpeg'},
        'libwebp is unavailable in ffmpeg. Falling back to JPEG variants.',
    );
    return {extension: 'jpg', mimeType: 'image/jpeg'};
}

async function renderImageThumb(inputPath: string, outputPath: string, encoding: ImageEncoding) {
    if (encoding.extension === 'webp') {
        await sharp(inputPath, {animated: true})
            .resize(480, 480, {fit: 'inside', withoutEnlargement: true})
            .webp({quality: 75})
            .toFile(outputPath);
        return;
    }
    await sharp(inputPath, {animated: true})
        .resize(480, 480, {fit: 'inside', withoutEnlargement: true})
        .jpeg({quality: 80})
        .toFile(outputPath);
}

async function renderVideoThumb(inputPath: string, outputPath: string, encoding: ImageEncoding) {
    if (encoding.extension === 'webp') {
        await runBinary`ffmpeg -y -ss 00:00:01 -i ${inputPath} -frames:v 1 -vf ${'scale=480:480:force_original_aspect_ratio=decrease'} -c:v libwebp -q:v 75 ${outputPath}`;
        return;
    }
    await runBinary`ffmpeg -y -ss 00:00:01 -i ${inputPath} -frames:v 1 -vf ${'scale=480:480:force_original_aspect_ratio=decrease'} -c:v mjpeg -q:v 3 ${outputPath}`;
}

async function countPdfPages(pdfPath: string) {
    const {stdout} = await runBinary`pdfinfo ${pdfPath}`;
    const match = stdout.match(/^Pages:\s+(\d+)/m);
    const pageCount = match ? Number.parseInt(match[1], 10) : 0;

    if (!Number.isFinite(pageCount) || pageCount <= 0) {
        throw new UnrecoverableError('Unable to read page count.');
    }

    return pageCount;
}

async function renderPdfPages(
    pdfPath: string,
    outputDir: string,
    pageCount: number,
    encoding: ImageEncoding,
) {
    const ppmPrefix = path.join(outputDir, 'page');
    await runBinary`pdftoppm -jpeg -f 1 -l ${String(pageCount)} ${pdfPath} ${ppmPrefix}`;

    const files = await fs.readdir(outputDir);
    const jpegFiles = files
        .filter((file) => /^page-\d+\.jpg$/i.test(file))
        .sort((left, right) => {
            const a = Number.parseInt(left.match(/\d+/)?.[0] ?? '0', 10);
            const b = Number.parseInt(right.match(/\d+/)?.[0] ?? '0', 10);
            return a - b;
        });

    if (jpegFiles.length === 0) {
        throw new UnrecoverableError('No rendered pages produced.');
    }

    const rendered: Array<{ index: number; filePath: string }> = [];
    for (let idx = 0; idx < jpegFiles.length; idx += 1) {
        const pageNumber = idx + 1;
        const inputPath = path.join(outputDir, jpegFiles[idx]);
        const outputPath = path.join(outputDir, `render-${pageNumber}.${encoding.extension}`);
        if (encoding.extension === 'webp') {
            await runBinary`ffmpeg -y -i ${inputPath} -frames:v 1 -vf ${'scale=1920:1920:force_original_aspect_ratio=decrease'} -c:v libwebp -q:v 75 ${outputPath}`;
        } else {
            await runBinary`ffmpeg -y -i ${inputPath} -frames:v 1 -vf ${'scale=1920:1920:force_original_aspect_ratio=decrease'} -c:v mjpeg -q:v 3 ${outputPath}`;
        }
        rendered.push({index: pageNumber, filePath: outputPath});
    }

    return rendered;
}

async function convertPresentationToPdf(inputPath: string, outputDir: string) {
    await runBinary`libreoffice --headless --convert-to pdf --outdir ${outputDir} ${inputPath}`;

    const baseName = path.basename(inputPath, path.extname(inputPath));
    const defaultPdfPath = path.join(outputDir, `${baseName}.pdf`);

    try {
        await fs.access(defaultPdfPath);
        return defaultPdfPath;
    } catch {
        const files = await fs.readdir(outputDir);
        const pdf = files.find((file) => file.toLowerCase().endsWith('.pdf'));
        if (!pdf) {
            throw new UnrecoverableError('LibreOffice did not output a PDF.');
        }
        return path.join(outputDir, pdf);
    }
}

async function upsertDerived(params: {
    sourceFileId: string;
    mediaItemId: string;
    organizationId: string;
    storageBucket: string;
    localFilePath: string;
    variant: 'THUMB' | 'RENDER';
    variantIndex: number;
    originalFileName: string;
    mimeType: string;
}) {
    const extension = path.extname(params.localFilePath).replace('.', '') || 'bin';
    const objectKey = buildDerivedMediaObjectKey({
        organizationId: params.organizationId,
        mediaItemId: params.mediaItemId,
        sourceMediaFileId: params.sourceFileId,
        variant: params.variant.toLowerCase() as 'thumb' | 'render',
        variantIndex: params.variantIndex,
        extension,
    });

    const body = await fs.readFile(params.localFilePath);
    const checksum = createHash('sha256').update(body).digest('hex');

    const storage = getStorageService();
    await storage.putObject({
        bucket: params.storageBucket,
        key: objectKey,
        body,
        contentType: params.mimeType,
    });

    const existing = await prisma.mediaFile.findFirst({
        where: {
            sourceMediaFileId: params.sourceFileId,
            variant: params.variant,
            variantIndex: params.variantIndex,
        },
        select: {id: true},
    });

    const payload = {
        mediaItemId: params.mediaItemId,
        sourceMediaFileId: params.sourceFileId,
        storageBucket: params.storageBucket,
        objectKey,
        originalFileName: params.originalFileName,
        storageProvider: 'S3' as const,
        status: 'READY' as const,
        variant: params.variant,
        variantIndex: params.variantIndex,
        mimeType: params.mimeType,
        fileSizeBytes: BigInt(body.byteLength),
        checksum,
        isPrimary: false,
    };

    if (existing) {
        await prisma.mediaFile.update({
            where: {id: existing.id},
            data: payload,
        });
        return;
    }

    await prisma.mediaFile.create({
        data: payload,
    });
}
