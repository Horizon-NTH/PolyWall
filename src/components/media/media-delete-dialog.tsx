'use client';

import type { ReactNode } from 'react';

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
import { Separator } from '@/components/ui/separator';

type MediaDeleteDialogProps = {
    playlistUsage: {
        count: number;
        playlistNames: string[];
    };
    onConfirm: () => void;
    confirmDisabled?: boolean;
    trigger?: ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    title?: ReactNode;
};

export function MediaDeleteDialog({
    playlistUsage,
    onConfirm,
    confirmDisabled = false,
    trigger,
    open,
    onOpenChange,
    title = 'Supprimer ce média ?',
}: MediaDeleteDialogProps) {
    const isDeletionBlocked = playlistUsage.count > 0;

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            {trigger ? <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger> : null}
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {isDeletionBlocked
                            ? `Suppression bloquée: ce média est encore utilisé dans ${playlistUsage.count} playlist${playlistUsage.count > 1 ? 's' : ''}.`
                            : 'Cette action est définitive. Le média, son original et ses variantes seront supprimés.'}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                {isDeletionBlocked ? (
                    <div className="max-h-60 space-y-2 overflow-y-auto text-sm">
                        {playlistUsage.playlistNames.map((playlistName, index) => (
                            <div key={playlistName}>
                                <p className="font-medium">{playlistName}</p>
                                {index < playlistUsage.playlistNames.length - 1 ? (
                                    <Separator className="mt-2" />
                                ) : null}
                            </div>
                        ))}
                    </div>
                ) : null}
                <AlertDialogFooter>
                    <AlertDialogCancel>{isDeletionBlocked ? 'Fermer' : 'Annuler'}</AlertDialogCancel>
                    {!isDeletionBlocked ? (
                        <AlertDialogAction onClick={onConfirm} variant="destructive" disabled={confirmDisabled}>
                            Supprimer
                        </AlertDialogAction>
                    ) : null}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
