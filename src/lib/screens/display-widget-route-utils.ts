import 'server-only';

import { prisma } from '@/lib/prisma';

export function findDisplayWidgetForDevice(deviceId: string, widgetId: string, technicalKey: string) {
    return prisma.screen.findFirst({
        where: {deviceId},
        select: {
            id: true,
            status: true,
            channel: {
                select: {
                    displayTemplate: {
                        select: {
                            zones: {
                                where: {
                                    widgetInstance: {
                                        id: widgetId,
                                        active: true,
                                        widgetType: {
                                            technicalKey,
                                        },
                                    },
                                },
                                select: {
                                    widgetInstance: {
                                        select: {
                                            id: true,
                                            configurationJson: true,
                                        },
                                    },
                                },
                                take: 1,
                            },
                        },
                    },
                },
            },
        },
    });
}
