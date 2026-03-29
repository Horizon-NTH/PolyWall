'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { deleteScreen, reactivateScreen, revokeScreen } from '@/actions/screen-actions';
import { ScreenStatus } from '@/generated/prisma/enums';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ChannelOption = {
    id: string;
    name: string;
};

type ScreenActionsCardProps = {
    screenId: string;
    screenName: string;
    status: ScreenStatus;
    channels: ChannelOption[];
};

export function ScreenActionsCard({screenId, screenName, status, channels}: ScreenActionsCardProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [openDelete, setOpenDelete] = useState(false);
    const [openRevoke, setOpenRevoke] = useState(false);
    const [openReactivate, setOpenReactivate] = useState(false);
    const [channelId, setChannelId] = useState('');

    const handleDelete = () => {
        startTransition(async () => {
            const result = await deleteScreen(screenId);
            if (!result.ok) {
                toast.error(result.message);
                return;
            }

            toast.success('Écran supprimé.');
            setOpenDelete(false);
            router.replace('/dashboard/screens');
            router.refresh();
        });
    };

    const handleRevoke = () => {
        startTransition(async () => {
            const result = await revokeScreen(screenId);
            if (!result.ok) {
                toast.error(result.message);
                return;
            }

            toast.success('Écran révoqué.');
            setOpenRevoke(false);
            router.refresh();
        });
    };

    const handleReactivate = () => {
        startTransition(async () => {
            const result = await reactivateScreen(screenId, {channelId});
            if (!result.ok) {
                toast.error(result.message);
                return;
            }

            toast.success('Écran réactivé.');
            setOpenReactivate(false);
            setChannelId('');
            router.refresh();
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Actions</CardTitle>
                <CardDescription>Révocation, réactivation et suppression de l&apos;écran.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
                {status !== ScreenStatus.REVOKED ? (
                    <AlertDialog open={openRevoke} onOpenChange={setOpenRevoke}>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" disabled={isPending}>Révoquer</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Révoquer {screenName} ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    L&apos;écran n&apos;aura plus accès à l&apos;affichage tant qu&apos;il n&apos;est pas réactivé.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={handleRevoke} disabled={isPending}>Révoquer</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                ) : (
                    <AlertDialog open={openReactivate} onOpenChange={setOpenReactivate}>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" disabled={isPending}>Réactiver</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Réactiver {screenName} ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Sélectionnez un canal de diffusion pour réactiver cet écran.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="grid gap-2">
                                <Select value={channelId} onValueChange={setChannelId}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Sélectionnez un canal" />
                                    </SelectTrigger>
                                    <SelectContent align="start">
                                        {channels.map((channel) => (
                                            <SelectItem key={channel.id} value={channel.id}>
                                                {channel.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={handleReactivate} disabled={isPending || !channelId}>
                                    Réactiver
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}

                <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isPending}>Supprimer</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer {screenName} ?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Cette action est définitive.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={isPending}>
                                Supprimer
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
}
