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

type DisplayTemplateDeleteDialogProps = {
    channelsCount: number;
    onConfirm: () => void;
    confirmDisabled?: boolean;
    trigger?: ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    title?: ReactNode;
};

export function DisplayTemplateDeleteDialog({
    channelsCount,
    onConfirm,
    confirmDisabled = false,
    trigger,
    open,
    onOpenChange,
    title = 'Supprimer ce modèle ?',
}: DisplayTemplateDeleteDialogProps) {
    const isDeletionBlocked = channelsCount > 0;

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            {trigger ? <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger> : null}
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {isDeletionBlocked
                            ? `Suppression bloquée: ce modèle est utilisé par ${channelsCount} canal${channelsCount > 1 ? 'aux' : ''}.`
                            : 'Cette action est définitive. La disposition et les widgets du modèle seront supprimés.'}
                    </AlertDialogDescription>
                </AlertDialogHeader>
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
