import pino from 'pino';

import { env } from '@/env';

const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

const level = env.LOG_LEVEL ?? (isTest ? 'silent' : isProd ? 'info' : 'debug');
const pretty = !isProd && env.LOG_PRETTY === true;

const transport = pretty
    ? pino.transport({
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
        },
    })
    : undefined;

export const logger = pino(
    {
        level,
        base: {
            app: 'polywall',
            env: process.env.NODE_ENV ?? 'development',
        },
        redact: {
            paths: [
                'password',
                'passwordHash',
                'token',
                'authorization',
                'cookie',
                'email',
                'name',
                'headers.authorization',
                'headers.cookie',
            ],
            censor: '[REDACTED]',
        },
    },
    transport,
);
