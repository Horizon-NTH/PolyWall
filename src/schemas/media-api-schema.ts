import { z } from 'zod';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 * 1024;

export const uploadIntentSchema = z.object({
    fileName: z.string().min(1).max(255),
    mimeType: z.string().min(1).max(255),
    fileSizeBytes: z.number().int().positive().max(MAX_FILE_SIZE_BYTES),
    checksum: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
    mediaItemId: z.string().min(1).optional(),
    title: z.string().min(1).max(120).optional(),
    description: z.string().min(1).max(500).optional(),
    durationSeconds: z.number().int().positive().max(24 * 3600).optional(),
    organizationId: z.string().min(1).optional(),
});

export const uploadCompleteSchema = z.object({
    mediaFileId: z.string().min(1),
    objectKey: z.string().min(1),
});
