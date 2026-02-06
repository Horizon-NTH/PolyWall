import 'server-only';

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '@/env';
import { logger } from '@/lib/logger';

export type MediaProcessingJobData = {
    mediaFileId: string;
    organizationId: string;
};

let queue: Queue<MediaProcessingJobData> | null = null;

function getQueue() {
    if (!env.REDIS_URL) return null;

    if (queue) return queue;

    const connection = new IORedis(env.REDIS_URL, {
        maxRetriesPerRequest: null,
    });

    queue = new Queue<MediaProcessingJobData>('media-processing', {
        connection,
    });

    return queue;
}

export async function enqueueMediaProcessing(data: MediaProcessingJobData) {
    const q = getQueue();
    if (!q) {
        logger.warn(
            {event: 'media.processing.enqueue', status: 'skipped', mediaFileId: data.mediaFileId},
            'Redis not configured, media processing queue skipped.',
        );
        return;
    }

    await q.add('process', data, {
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
        removeOnComplete: 1000,
        removeOnFail: 2000,
    });
}
