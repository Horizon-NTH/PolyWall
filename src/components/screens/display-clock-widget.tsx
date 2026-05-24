'use client';

import * as React from 'react';

import { type DisplayWidgetProps } from '@/components/screens/display-widget-types';
import { getDisplayWidgetColorScheme } from '@/components/screens/display-widget-theme';
import { getRequiredStringConfig } from '@/lib/config/json-config';
import { cn } from '@/lib/utils';

export function ClockWidget({widget, zoneConfiguration}: DisplayWidgetProps) {
    const [now, setNow] = React.useState(() => new Date());
    const timezone = getRequiredStringConfig(widget.configurationJson, 'timezone', 'Europe/Paris');
    const format = getRequiredStringConfig(widget.configurationJson, 'format', 'HH:mm');
    const includesSeconds = format.includes('ss');
    const colorScheme = getDisplayWidgetColorScheme(zoneConfiguration);

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
        <div className={cn(
            'flex h-full w-full items-center justify-center overflow-hidden [container-type:size]',
            colorScheme.textClassName,
        )}>
            <span className="max-w-full whitespace-nowrap leading-none font-semibold tabular-nums" style={{fontSize}}>
                {new Intl.DateTimeFormat('fr-FR', options).format(now)}
            </span>
        </div>
    );
}
