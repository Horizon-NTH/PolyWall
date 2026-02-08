'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { deleteMediaItem, toggleMediaItemActive } from '@/actions/media-actions';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type MediaActionsCardProps = {
    mediaItemId: string;
    mediaTitle: string;
    isActive: boolean;
};

export function MediaActionsCard({mediaItemId, mediaTitle, isActive}: MediaActionsCardProps) {
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
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isPending}>
                            Supprimer
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="break-all">Supprimer {mediaTitle} ?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Cette action est définitive. Le média, son original et ses variantes seront supprimés.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} variant="destructive" disabled={isPending}>
                                Supprimer
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
}
