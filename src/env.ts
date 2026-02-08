import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
    /*
     * Serverside Environment variables, not available on the client.
     * Will throw if you access these variables on the client.
     */
    server: {
        DATABASE_URL: z.url(),
        AUTH_SECRET: z.string().min(1),
        AUTH_TRUST_HOST: z.coerce.boolean().optional(),
        AUTH_URL: z.url().optional(),
        STORAGE_DRIVER: z.enum(['s3']).default('s3'),
        S3_ENDPOINT: z.url().default('http://localhost:9000'),
        S3_REGION: z.string().min(1).default('eu-west-3'),
        S3_BUCKET: z.string().min(3).default('polywall-dev'),
        S3_ACCESS_KEY_ID: z.string().min(1).default('polywall'),
        S3_SECRET_ACCESS_KEY: z.string().min(1).default('polywallsecret'),
        S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),
        S3_PUBLIC_BASE_URL: z.url().optional(),
        UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(1024 * 1024 * 1024),
        UPLOAD_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
        DOWNLOAD_URL_TTL_SECONDS: z.coerce.number().int().min(30).max(3600).default(300),
        LOG_LEVEL: z.string().min(1).optional(),
        LOG_PRETTY: z.coerce.boolean().optional(),
        REDIS_URL: z.string().url().optional(),
        RATE_LIMIT_DISABLED: z.coerce.boolean().optional(),
    },
    /*
     * Environment variables available on the client (and server).
     *
     * 💡 You'll get type errors if these are not prefixed with NEXT_PUBLIC_.
     */
    client: {},
    /*
     * Due to how Next.js bundles environment variables on Edge and Client,
     * we need to manually destructure them to make sure all are included in bundle.
     *
     * 💡 You'll get type errors if not all variables from `server` & `client` are included here.
     */
    runtimeEnv: {
        DATABASE_URL: process.env.DATABASE_URL,
        AUTH_SECRET: process.env.AUTH_SECRET,
        AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST,
        AUTH_URL: process.env.AUTH_URL,
        STORAGE_DRIVER: process.env.STORAGE_DRIVER,
        S3_ENDPOINT: process.env.S3_ENDPOINT,
        S3_REGION: process.env.S3_REGION,
        S3_BUCKET: process.env.S3_BUCKET,
        S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
        S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
        S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE,
        S3_PUBLIC_BASE_URL: process.env.S3_PUBLIC_BASE_URL,
        UPLOAD_MAX_BYTES: process.env.UPLOAD_MAX_BYTES,
        UPLOAD_URL_TTL_SECONDS: process.env.UPLOAD_URL_TTL_SECONDS,
        DOWNLOAD_URL_TTL_SECONDS: process.env.DOWNLOAD_URL_TTL_SECONDS,
        LOG_LEVEL: process.env.LOG_LEVEL,
        LOG_PRETTY: process.env.LOG_PRETTY,
        REDIS_URL: process.env.REDIS_URL,
        RATE_LIMIT_DISABLED: process.env.RATE_LIMIT_DISABLED,
    },
});
