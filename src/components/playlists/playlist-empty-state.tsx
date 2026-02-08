import Link from 'next/link';
import { ListMusic } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';

type PlaylistEmptyStateProps = {
    createHref?: string;
};

export function PlaylistEmptyState({createHref = '/dashboard/playlists/new'}: PlaylistEmptyStateProps) {
    return (
        <Empty>
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <ListMusic className="size-5" />
                </EmptyMedia>
                <EmptyTitle>Aucune playlist</EmptyTitle>
                <EmptyDescription>
                    Créez une playlist pour organiser et diffuser vos médias.
                </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
                <Button asChild>
                    <Link href={createHref}>Créer une playlist</Link>
                </Button>
            </EmptyContent>
        </Empty>
    );
}
