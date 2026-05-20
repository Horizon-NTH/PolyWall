'use client';

import * as React from 'react';

import { ClockWidget } from '@/components/screens/display-clock-widget';
import { RssWidget } from '@/components/screens/display-rss-widget';
import { TransitWidget } from '@/components/screens/display-transit-widget';
import { WidgetPlaceholder } from '@/components/screens/display-widget-placeholder';
import { type DisplayWidgetProps } from '@/components/screens/display-widget-types';
import { getWidgetLabel, SUPPORTED_WIDGET_KEYS } from '@/lib/widgets/widget-catalog';

function PlaceholderWidget({widget, zoneConfiguration}: DisplayWidgetProps) {
    return (
        <WidgetPlaceholder
            label={getWidgetLabel(widget.technicalKey)}
            detail="Source dynamique à connecter"
            zoneConfiguration={zoneConfiguration}
        />
    );
}

const IMPLEMENTED_WIDGETS = {
    clock: ClockWidget,
    rss: RssWidget,
    transit: TransitWidget,
} satisfies Partial<Record<(typeof SUPPORTED_WIDGET_KEYS)[number], React.ComponentType<DisplayWidgetProps>>>;

const WIDGET_REGISTRY = Object.fromEntries(
    SUPPORTED_WIDGET_KEYS.map((technicalKey) => [
        technicalKey,
        IMPLEMENTED_WIDGETS[technicalKey as keyof typeof IMPLEMENTED_WIDGETS] ?? PlaceholderWidget,
    ]),
) as Record<string, React.ComponentType<DisplayWidgetProps>>;

export function DisplayWidget({widget, deviceId, zoneConfiguration}: DisplayWidgetProps) {
    const WidgetComponent = WIDGET_REGISTRY[widget.technicalKey];
    if (!WidgetComponent) {
        return (
            <WidgetPlaceholder
                label="Widget"
                detail={`Widget inconnu: ${widget.technicalKey}`}
                zoneConfiguration={zoneConfiguration}
            />
        );
    }

    return <WidgetComponent widget={widget} deviceId={deviceId} zoneConfiguration={zoneConfiguration} />;
}
