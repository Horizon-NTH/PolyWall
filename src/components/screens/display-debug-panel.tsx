'use client';

import * as React from 'react';
import { BugIcon, RotateCcwIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DISPLAY_DEBUG_PRESET_OPTIONS,
    type DisplayDebugPreset,
} from '@/lib/screens/display-debug';

type DisplayDebugPanelProps = {
    preset: DisplayDebugPreset;
    onPresetChange: (preset: DisplayDebugPreset) => void;
};

export function DisplayDebugPanel(props: DisplayDebugPanelProps) {
    const [open, setOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const selectedOption = DISPLAY_DEBUG_PRESET_OPTIONS.find((option) => option.value === props.preset)
        ?? DISPLAY_DEBUG_PRESET_OPTIONS[0]!;

    React.useEffect(() => {
        if (!open) return;

        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest('[data-slot="select-content"]')) {
                return;
            }

            if (!containerRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
        };
    }, [open]);

    return (
        <div ref={containerRef} className="fixed right-4 bottom-4 z-50">
            <Collapsible open={open} onOpenChange={setOpen}>
                <CollapsibleContent
                    className="absolute right-0 bottom-full mb-3 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
                    <Card className="w-[min(22rem,calc(100vw-2rem))] shadow-lg">
                        <CardHeader>
                            <CardTitle>Display Debug</CardTitle>
                            <CardDescription>
                                Simule les états du player sans dépendre du backend.
                            </CardDescription>
                            <CardAction>
                                <Badge variant={props.preset === 'live' ? 'outline' : 'secondary'}>
                                    <BugIcon data-icon="inline-start" />
                                    {props.preset === 'live' ? 'Live' : 'Mock'}
                                </Badge>
                            </CardAction>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            <div className="flex flex-col gap-2">
                                <p className="text-sm font-medium">Preset</p>
                                <Select
                                    value={props.preset}
                                    onValueChange={(value) => props.onPresetChange(value as DisplayDebugPreset)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Sélectionner un état" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {DISPLAY_DEBUG_PRESET_OPTIONS.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                                <p className="text-muted-foreground text-sm">{selectedOption.description}</p>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-muted-foreground text-xs">
                                    Disponible uniquement en développement.
                                </p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => props.onPresetChange('live')}
                                    disabled={props.preset === 'live'}
                                >
                                    <RotateCcwIcon data-icon="inline-start" />
                                    Revenir au live
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </CollapsibleContent>
                <CollapsibleTrigger asChild>
                    <Button
                        type="button"
                        size="icon-lg"
                        variant={props.preset === 'live' ? 'outline' : 'secondary'}
                        className="relative cursor-pointer rounded-full shadow-lg"
                        aria-label={open ? 'Fermer Display Debug' : 'Ouvrir Display Debug'}
                    >
                        <BugIcon />
                        <span className="sr-only">Display Debug</span>
                        {props.preset !== 'live' ? (
                            <span
                                className="bg-primary absolute -top-1 -right-1 size-3 rounded-full border-2 border-background" />
                        ) : null}
                    </Button>
                </CollapsibleTrigger>
            </Collapsible>
        </div>
    );
}
