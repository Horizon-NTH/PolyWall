import { getDisplayWidgetColorScheme } from '@/components/screens/display-widget-theme';
import { cn } from '@/lib/utils';

export function WidgetPlaceholder({
                                      label,
                                      detail,
                                      zoneConfiguration,
                                  }: {
    label: string;
    detail: string;
    zoneConfiguration?: Record<string, unknown>;
}) {
    const colorScheme = getDisplayWidgetColorScheme(zoneConfiguration);

    return (
        <div className={cn(
            'flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center',
            colorScheme.textClassName,
        )}>
            <p className="text-[clamp(1rem,2vw,2rem)] font-semibold">{label}</p>
            <p className={cn('text-[clamp(.75rem,1.2vw,1rem)]', colorScheme.mutedTextClassName)}>{detail}</p>
        </div>
    );
}
