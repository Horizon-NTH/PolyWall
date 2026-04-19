'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { deleteMediaItem, toggleMediaItemActive } from '@/actions/media-actions';
import { MediaDeleteDialog } from '@/components/media/media-delete-dialog';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

type MediaActionsCardProps = {
    mediaItemId: string;
    mediaTitle: string;
    isActive: boolean;
    playlistUsage: {
        count: number;
        playlistNames: string[];
    };
};

export function MediaActionsCard({mediaItemId, mediaTitle, isActive, playlistUsage}: MediaActionsCardProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleToggle = () => {
        startTransition(async () => {
            const result = await toggleMediaItemActive(mediaItemId);
            if (!result.ok) {
                toast.error(result.message);
                return;
            }

            toast.success(isActive ? 'Média désactivé.' : 'Média activé.');
            router.refresh();
        });
    };

    const handleDelete = () => {
        startTransition(async () => {
            const result = await deleteMediaItem(mediaItemId);
            if (!result.ok) {
                toast.error(result.message);
                return;
            }

            toast.success('Média supprimé.');
            router.replace('/dashboard/media');
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Actions</CardTitle>
                <CardDescription>Gérez le statut et la suppression du média.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
                <Button
                    variant={isActive ? 'outline' : 'default'}
                    onClick={handleToggle}
                    disabled={isPending}
                >
                    {isActive ? 'Désactiver' : 'Activer'}
                </Button>
                <MediaDeleteDialog
                    playlistUsage={playlistUsage}
                    onConfirm={handleDelete}
                    confirmDisabled={isPending}
                    trigger={
                        <Button variant="destructive" disabled={isPending}>
                            Supprimer
                        </Button>
                    }
                    title={<span className="break-all">Supprimer {mediaTitle} ?</span>}
                />
            </CardContent>
        </Card>
    );
}
