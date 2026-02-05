import { logger } from '@/lib/logger';

export type ActionStatus = 'success' | 'error' | 'denied' | 'invalid';

export type ActionContext = {
    event: string;
    action: 'create' | 'update' | 'delete' | 'toggle' | 'switch' | 'change';
    organizationId?: string | null;
    actorUserId?: string | null;
    targetId?: string | null;
};

type LogExtras = Record<string, unknown>;

function extractErrorDetails(error: unknown) {
    if (error instanceof Error) {
        const code = (error as { code?: string }).code;
        return {message: error.message, code};
    }

    if (error && typeof error === 'object') {
        const code = (error as { code?: string }).code;
        const message = (error as { message?: string }).message;
        return {message: message ?? 'Unknown error', code};
    }

    return {message: 'Unknown error', code: undefined};
}

export function createActionLogger(context: ActionContext) {
    const startedAt = Date.now();
    const scoped = logger.child(context);

    scoped.info({phase: 'start'});

    const withDuration = (extra?: LogExtras) => ({
        durationMs: Date.now() - startedAt,
        ...extra,
    });

    return {
        success(extra?: LogExtras) {
            scoped.info({status: 'success', ...withDuration(extra)});
        },
        invalid(extra?: LogExtras) {
            scoped.info({status: 'invalid', ...withDuration(extra)});
        },
        denied(extra?: LogExtras) {
            scoped.info({status: 'denied', ...withDuration(extra)});
        },
        error(error: unknown, extra?: LogExtras) {
            const details = extractErrorDetails(error);
            scoped.error({status: 'error', error: details, ...withDuration(extra)});
        },
    };
}
