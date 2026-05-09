'use client';

import * as React from 'react';

import { type DisplayWidgetInstance } from '@/lib/display-runtime/types';
import { getRequiredStringConfig } from '@/lib/config/json-config';
import { getWidgetLabel, SUPPORTED_WIDGET_KEYS } from '@/lib/widgets/widget-catalog';

type DisplayWidgetProps = {
    widget: DisplayWidgetInstance;
};

function ClockWidget({widget}: DisplayWidgetProps) {
    const [now, setNow] = React.useState(() => new Date());
    const timezone = getRequiredStringConfig(widget.configurationJson, 'timezone', 'Europe/Paris');
    const format = getRequiredStringConfig(widget.configurationJson, 'format', 'HH:mm');
    const includesSeconds = format.includes('ss');

    React.useEffect(() => {
        const interval = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(interval);
    }, []);

    const options: Intl.DateTimeFormatOptions = includesSeconds
        ? {hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: timezone}
        : {hour: '2-digit', minute: '2-digit', timeZone: timezone};
    const fontSize = includesSeconds
        ? 'min(80cqh, calc(90cqw / 5.2))'
        : 'min(80cqh, calc(90cqw / 3.3))';

    return (
        <div className="flex h-full w-full items-center justify-center overflow-hidden text-white [container-type:size]">
            <span className="max-w-full whitespace-nowrap leading-none font-semibold tabular-nums" style={{fontSize}}>
                {new Intl.DateTimeFormat('fr-FR', options).format(now)}
            </span>
        </div>
    );
}

function WidgetPlaceholder({label, detail}: { label: string; detail: string }) {
    return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-white/8 p-4 text-center text-white">
            <p className="text-[clamp(1rem,2vw,2rem)] font-semibold">{label}</p>
            <p className="text-[clamp(.75rem,1.2vw,1rem)] text-white/70">{detail}</p>
        </div>
    );
}

function PlaceholderWidget({widget}: DisplayWidgetProps) {
    return <WidgetPlaceholder label={getWidgetLabel(widget.technicalKey)} detail="Source dynamique à connecter" />;
}

const WIDGET_REGISTRY = Object.fromEntries(
    SUPPORTED_WIDGET_KEYS.map((technicalKey) => [
        technicalKey,
        technicalKey === 'clock' ? ClockWidget : PlaceholderWidget,
    ]),
) as Record<string, React.ComponentType<DisplayWidgetProps>>;

export function DisplayWidget({widget}: DisplayWidgetProps) {
    const WidgetComponent = WIDGET_REGISTRY[widget.technicalKey];
    if (!WidgetComponent) {
        return <WidgetPlaceholder label="Widget" detail={`Widget inconnu: ${widget.technicalKey}`} />;
    }

    return <WidgetComponent widget={widget} />;
}
