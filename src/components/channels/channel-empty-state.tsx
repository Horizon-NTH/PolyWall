import Link from 'next/link';
import { Radio } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';

type ChannelEmptyStateProps = {
    canCreate?: boolean;
    createHref?: string;
};

export function ChannelEmptyState({
                                      canCreate = true,
                                      createHref = '/dashboard/channels/new',
                                  }: ChannelEmptyStateProps) {
    return (
        <Empty>
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <Radio className="size-5" />
                </EmptyMedia>
                <EmptyTitle>Aucun canal</EmptyTitle>
                <EmptyDescription>
                    Créez un canal pour organiser vos diffusions et associer vos écrans.
                </EmptyDescription>
            </EmptyHeader>
            {canCreate ? (
                <EmptyContent>
                    <Button asChild>
                        <Link href={createHref}>Créer un canal</Link>
                    </Button>
                </EmptyContent>
            ) : null}
        </Empty>
    );
}
