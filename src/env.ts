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
        LOG_LEVEL: process.env.LOG_LEVEL,
        LOG_PRETTY: process.env.LOG_PRETTY,
        REDIS_URL: process.env.REDIS_URL,
        RATE_LIMIT_DISABLED: process.env.RATE_LIMIT_DISABLED,
    },
});
