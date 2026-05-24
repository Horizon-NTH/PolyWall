'use client';

import { type ReactNode } from 'react';
import { Info } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type HelpLabelProps = {
    htmlFor?: string;
    children: ReactNode;
    help: string;
};

export function HelpLabel({htmlFor, children, help}: HelpLabelProps) {
    return (
        <div className="flex w-fit items-center gap-1.5">
            <Label htmlFor={htmlFor}>{children}</Label>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground inline-flex size-4 translate-y-px items-center justify-center rounded-sm"
                        aria-label={`Aide: ${String(children)}`}
                    >
                        <Info />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={6} className="max-w-72">
                    {help}
                </TooltipContent>
            </Tooltip>
        </div>
    );
}
