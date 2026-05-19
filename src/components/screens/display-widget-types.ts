import { type DisplayWidgetInstance } from '@/lib/display-runtime/types';

export type DisplayWidgetProps = {
    widget: DisplayWidgetInstance;
    deviceId?: string | null;
    zoneConfiguration?: Record<string, unknown>;
};
