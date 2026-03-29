'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

type TabsContextValue = {
    value: string;
    setValue: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext() {
    const context = React.useContext(TabsContext);
    if (!context) {
        throw new Error('Tabs components must be used within <Tabs>.');
    }
    return context;
}

type TabsProps = React.HTMLAttributes<HTMLDivElement> & {
    value: string;
    onValueChange: (value: string) => void;
};

function Tabs({className, value, onValueChange, ...props}: TabsProps) {
    const contextValue = React.useMemo(() => ({value, setValue: onValueChange}), [onValueChange, value]);

    return (
        <TabsContext.Provider value={contextValue}>
            <div className={cn('flex flex-col gap-2', className)} {...props} />
        </TabsContext.Provider>
    );
}

function TabsList({className, ...props}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            role="tablist"
            className={cn(
                'bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]',
                className,
            )}
            {...props}
        />
    );
}

type TabsTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    value: string;
};

function TabsTrigger({className, value, ...props}: TabsTriggerProps) {
    const {value: currentValue, setValue} = useTabsContext();
    const active = currentValue === value;

    return (
        <button
            role="tab"
            type="button"
            aria-selected={active}
            data-state={active ? 'active' : 'inactive'}
            className={cn(
                'inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow]',
                active ? 'bg-background text-foreground shadow-sm' : '',
                className,
            )}
            onClick={() => setValue(value)}
            {...props}
        />
    );
}

function TabsContent({className, ...props}: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('flex-1 outline-none', className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
