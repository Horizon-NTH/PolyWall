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

type ScheduleDeleteDialogProps = {
    onConfirm: () => void;
    confirmDisabled?: boolean;
    trigger?: ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    title?: ReactNode;
    description?: ReactNode;
};

export function ScheduleDeleteDialog({
    onConfirm,
    confirmDisabled = false,
    trigger,
    open,
    onOpenChange,
    title = 'Supprimer cette programmation ?',
    description = 'Cette action est définitive. Le canal retombera automatiquement sur la règle de priorité inférieure.',
}: ScheduleDeleteDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            {trigger ? <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger> : null}
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm} variant="destructive" disabled={confirmDisabled}>
                        Supprimer
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
