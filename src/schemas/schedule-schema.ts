import { z } from 'zod';

import { DayOfWeek, ScheduleType } from '@/generated/prisma/enums';

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

const commonScheduleSchema = z.object({
    type: z.enum(ScheduleType),
    channelId: z.string().trim().min(1, 'Le canal est requis.'),
    playlistId: z.string().trim().min(1, 'La playlist est requise.'),
    active: z.boolean().default(true),
    startTime: z.string().trim().optional(),
    endMode: z.enum(['time', 'playlist']).default('playlist'),
    endTime: z.string().trim().optional(),
    date: z.string().trim().optional(),
    daysOfWeek: z.array(z.enum(DayOfWeek)).default([]),
});

export const scheduleCreateSchema = commonScheduleSchema.superRefine((data, ctx) => {
    if (data.type === ScheduleType.DEFAULT) {
        return;
    }

    if (!data.startTime) {
        ctx.addIssue({
            code: 'custom',
            path: ['startTime'],
            message: 'L\'heure de début est requise.',
        });
    } else if (!timePattern.test(data.startTime)) {
        ctx.addIssue({
            code: 'custom',
            path: ['startTime'],
            message: 'L\'heure de début est invalide.',
        });
    }

    if (data.endMode === 'time') {
        if (!data.endTime) {
            ctx.addIssue({
                code: 'custom',
                path: ['endTime'],
                message: 'L\'heure de fin est requise.',
            });
        } else if (!timePattern.test(data.endTime)) {
            ctx.addIssue({
                code: 'custom',
                path: ['endTime'],
                message: 'L\'heure de fin est invalide.',
            });
        } else if (data.startTime && timePattern.test(data.startTime) && data.startTime >= data.endTime) {
            ctx.addIssue({
                code: 'custom',
                path: ['endTime'],
                message: 'L\'heure de fin doit être postérieure à l\'heure de début.',
            });
        }
    }

    if (data.type === ScheduleType.RECURRING && data.daysOfWeek.length === 0) {
        ctx.addIssue({
            code: 'custom',
            path: ['daysOfWeek'],
            message: 'Sélectionnez au moins un jour.',
        });
    }

    if (data.type === ScheduleType.EVENT) {
        if (!data.date) {
            ctx.addIssue({
                code: 'custom',
                path: ['date'],
                message: 'La date est requise.',
            });
        } else if (Number.isNaN(new Date(`${data.date}T00:00:00Z`).getTime())) {
            ctx.addIssue({
                code: 'custom',
                path: ['date'],
                message: 'La date est invalide.',
            });
        }
    }
});

export const scheduleUpdateSchema = scheduleCreateSchema;

export const scheduleDeleteSchema = z.object({
    scheduleId: z.string().trim().min(1, 'La programmation est requise.'),
});

export const scheduleListFilterSchema = z.object({
    q: z.string().trim().default(''),
    type: z.enum(['all', ScheduleType.RECURRING, ScheduleType.EVENT]).default('all'),
    active: z.enum(['all', 'active', 'inactive']).default('all'),
    sort: z
        .enum([
            'updatedAt-desc',
            'updatedAt-asc',
            'createdAt-desc',
            'createdAt-asc',
            'playlist-asc',
            'playlist-desc',
            'type-asc',
            'type-desc',
        ])
        .default('updatedAt-desc'),
});

export type ScheduleCreateValues = z.infer<typeof scheduleCreateSchema>;
export type ScheduleUpdateValues = z.infer<typeof scheduleUpdateSchema>;
export type ScheduleDeleteValues = z.infer<typeof scheduleDeleteSchema>;
export type ScheduleListFilterValues = z.infer<typeof scheduleListFilterSchema>;
