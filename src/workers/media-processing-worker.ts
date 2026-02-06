import 'dotenv/config';

import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '@/env';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

type MediaProcessingJobData = {
    mediaFileId: string;
    organizationId: string;
};

if (!env.REDIS_URL) {
    throw new Error('REDIS_URL is required to run media processing worker.');
}

const connection = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
});

const worker = new Worker<MediaProcessingJobData>(
    'media-processing',
    async (job) => {
        const mediaFile = await prisma.mediaFile.findUnique({
            where: {id: job.data.mediaFileId},
            select: {id: true, status: true, metaJson: true},
        });

        if (!mediaFile) {
            logger.warn(
                {event: 'media.processing', mediaFileId: job.data.mediaFileId},
                'Media file not found.',
            );
            return;
        }

        await prisma.mediaFile.update({
            where: {id: job.data.mediaFileId},
            data: {
                status: 'READY',
                metaJson: {
                    ...(mediaFile.metaJson && typeof mediaFile.metaJson === 'object'
                        ? mediaFile.metaJson
                        : {}),
                    processedAt: new Date().toISOString(),
                },
            },
        });
    },
    {connection},
);

worker.on('ready', () => {
    logger.info({event: 'media.processing.worker.start'}, 'Media worker started.');
});

worker.on('completed', (job) => {
    logger.info(
        {event: 'media.processing.completed', mediaFileId: job.data.mediaFileId},
        'Media processing completed.',
    );
});

worker.on('failed', (job, error) => {
    logger.error(
        {event: 'media.processing.failed', mediaFileId: job?.data.mediaFileId, error},
        'Media processing failed.',
    );
});
