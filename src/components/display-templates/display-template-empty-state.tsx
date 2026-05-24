import Link from 'next/link';
import { PanelsTopLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';

type DisplayTemplateEmptyStateProps = {
    canCreate?: boolean;
};

export function DisplayTemplateEmptyState({canCreate = true}: DisplayTemplateEmptyStateProps) {
    return (
        <Empty>
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <PanelsTopLeft className="size-5" />
                </EmptyMedia>
                <EmptyTitle>Aucun modèle d&apos;affichage</EmptyTitle>
                <EmptyDescription>
                    Créez un modèle pour structurer les zones médias, widgets et contenus statiques.
                </EmptyDescription>
            </EmptyHeader>
            {canCreate ? (
                <EmptyContent>
                    <Button asChild>
                        <Link href="/dashboard/display-templates/new">Créer un modèle</Link>
                    </Button>
                </EmptyContent>
            ) : null}
        </Empty>
    );
}
