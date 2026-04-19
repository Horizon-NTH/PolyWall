'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { deletePlaylist } from '@/actions/playlist-actions';
import { type PlaylistScheduleImpact } from '@/lib/playlists/playlist-schedule-impact';
import { PlaylistDeleteDialog } from '@/components/playlists/playlist-delete-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type PlaylistActionsCardProps = {
    playlistId: string;
    playlistName: string;
    impactedSchedules: PlaylistScheduleImpact[];
};

export function PlaylistActionsCard({playlistId, playlistName, impactedSchedules}: PlaylistActionsCardProps) {
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
                <PlaylistDeleteDialog
                    impactedSchedules={impactedSchedules}
                    onConfirm={handleDelete}
                    confirmDisabled={isPending}
                    trigger={
                        <Button variant="destructive" disabled={isPending}>
                            Supprimer
                        </Button>
                    }
                    title={<span className="break-all">Supprimer {playlistName} ?</span>}
                    descriptionPrefix="Cette action est définitive. La playlist et sa timeline seront supprimées."
                />
            </CardContent>
        </Card>
    );
}
