import 'server-only';

import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '@/env';

declare const global: {
    prisma: PrismaClient;
};

const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
});

export const prisma = global.prisma || new PrismaClient({adapter});

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;
