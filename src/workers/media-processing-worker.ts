import 'dotenv/config';

import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '@/env';
import { logger } from '@/lib/logger';
import { processMediaFile, type MediaProcessingJobData } from '@/lib/media/process-media-file';

if (!env.REDIS_URL) {
    throw new Error('REDIS_URL is required to run media processing worker.');
}

const connection = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
});

const worker = new Worker<MediaProcessingJobData>(
    'media-processing',
    async (job) => {
        await processMediaFile(job.data);
    },
    {connection},
);

worker.on('ready', () => {
    logger.info({event: 'media.processing.worker.start'}, 'Media worker started.');
});

worker.on('completed', (job) => {
    logger.info(
        {
            event: 'media.processing.completed',
            mediaFileId: job.data.mediaFileId,
            organizationId: job.data.organizationId,
        },
        'Media processing completed.',
    );
});

worker.on('failed', (job, error) => {
    logger.error(
        {
            event: 'media.processing.failed',
            mediaFileId: job?.data.mediaFileId,
            organizationId: job?.data.organizationId,
            error,
        },
        'Media processing failed.',
    );
});
