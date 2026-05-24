'use client';

import { type ReactNode } from 'react';
import { CheckIcon } from 'lucide-react';
import { Select as SelectPrimitive } from 'radix-ui';

type SelectPreviewItemProps = {
    value: string;
    textValue: string;
    children: ReactNode;
};

export function SelectPreviewItem({value, textValue, children}: SelectPreviewItemProps) {
    return (
        <SelectPrimitive.Item
            value={value}
            textValue={textValue}
            className="focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-default items-center gap-3 rounded-sm py-2 pr-8 pl-2 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50"
        >
            <SelectPrimitive.ItemText>
                <span className="sr-only">{textValue}</span>
            </SelectPrimitive.ItemText>
            {children}
            <span className="absolute right-2 flex size-3.5 items-center justify-center">
                <SelectPrimitive.ItemIndicator>
                    <CheckIcon className="size-4" />
                </SelectPrimitive.ItemIndicator>
            </span>
        </SelectPrimitive.Item>
    );
}
