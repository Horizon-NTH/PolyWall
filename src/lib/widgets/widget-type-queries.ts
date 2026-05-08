import 'server-only';

import { prisma } from '@/lib/prisma';
import { SUPPORTED_WIDGET_KEYS } from '@/lib/widgets/widget-catalog';

export function findSupportedWidgetTypeOptions() {
    return prisma.widgetType.findMany({
        where: {
            technicalKey: {
                in: SUPPORTED_WIDGET_KEYS,
            },
        },
        select: {
            id: true,
            name: true,
            technicalKey: true,
        },
        orderBy: {name: 'asc'},
    });
}

export async function areSupportedWidgetTypeIds(widgetTypeIds: string[]) {
    const uniqueIds = [...new Set(widgetTypeIds)];
    if (uniqueIds.length === 0) return true;

    const widgetTypes = await prisma.widgetType.findMany({
        where: {
            id: {
                in: uniqueIds,
            },
            technicalKey: {
                in: SUPPORTED_WIDGET_KEYS,
            },
        },
        select: {id: true},
    });

    return widgetTypes.length === uniqueIds.length;
}
