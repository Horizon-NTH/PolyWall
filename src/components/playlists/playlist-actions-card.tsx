'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { deletePlaylist } from '@/actions/playlist-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

type PlaylistActionsCardProps = {
    playlistId: string;
    playlistName: string;
};

export function PlaylistActionsCard({playlistId, playlistName}: PlaylistActionsCardProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleDelete = () => {
        startTransition(async () => {
            const result = await deletePlaylist(playlistId);
            if (!result.ok) {
                toast.error(result.message);
                return;
            }

            toast.success('Playlist supprimée.');
            router.replace('/dashboard/playlists');
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Actions</CardTitle>
                <CardDescription>Supprimez cette playlist si elle n&apos;est plus utile.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isPending}>
                            Supprimer
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="break-all">Supprimer {playlistName} ?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Cette action est définitive. La playlist et sa timeline seront supprimées.
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
