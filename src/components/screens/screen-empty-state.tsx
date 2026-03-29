import { Monitor } from 'lucide-react';

import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';

export function ScreenEmptyState() {
    return (
        <Empty>
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <Monitor className="size-5" />
                </EmptyMedia>
                <EmptyTitle>Aucun écran</EmptyTitle>
                <EmptyDescription>
                    Aucun écran n&apos;est encore appairé avec cette organisation.
                </EmptyDescription>
            </EmptyHeader>
        </Empty>
    );
}
