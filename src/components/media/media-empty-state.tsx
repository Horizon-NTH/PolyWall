import Link from 'next/link';
import { Image as ImageIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';

type MediaEmptyStateProps = {
    createHref?: string;
};

export function MediaEmptyState({createHref = '/dashboard/media/new'}: MediaEmptyStateProps) {
    return (
        <Empty>
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <ImageIcon className="size-5" />
                </EmptyMedia>
                <EmptyTitle>Aucun média</EmptyTitle>
                <EmptyDescription>
                    Commencez par importer un média pour alimenter votre bibliothèque.
                </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
                <Button asChild>
                    <Link href={createHref}>Créer un média</Link>
                </Button>
            </EmptyContent>
        </Empty>
    );
}
