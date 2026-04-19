'use client';

import type { ReactNode, MouseEvent } from 'react';

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

type ReassignOption = {
    id: string;
    name: string;
};

type ChannelDeleteDialogProps = {
    screensCount: number;
    reassignToChannelId: string;
    onReassignToChannelIdChange: (value: string) => void;
    reassignOptions: ReassignOption[];
    showReassignField?: boolean;
    onConfirm: () => void;
    confirmDisabled?: boolean;
    keepOpenOnConfirm?: boolean;
    trigger?: ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    title?: ReactNode;
};

export function ChannelDeleteDialog({
    screensCount,
    reassignToChannelId,
    onReassignToChannelIdChange,
    reassignOptions,
    showReassignField = true,
    onConfirm,
    confirmDisabled = false,
    keepOpenOnConfirm = false,
    trigger,
    open,
    onOpenChange,
    title = 'Supprimer ce canal ?',
}: ChannelDeleteDialogProps) {
    const needsReassign = screensCount > 0;

    const handleConfirm = (event: MouseEvent<HTMLButtonElement>) => {
        if (keepOpenOnConfirm) {
            event.preventDefault();
        }
        onConfirm();
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            {trigger ? <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger> : null}
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        Cette action est définitive.
                        {needsReassign ? ' Les écrans seront réaffectés au canal sélectionné.' : ''}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                {needsReassign && showReassignField ? (
                    <div className="grid gap-2">
                        <p className="text-muted-foreground text-sm">Canal de réaffectation des écrans</p>
                        <Select
                            value={reassignToChannelId}
                            onValueChange={onReassignToChannelIdChange}
                            disabled={reassignOptions.length === 0}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Sélectionnez un canal" />
                            </SelectTrigger>
                            <SelectContent align="start">
                                {reassignOptions.map((channel) => (
                                    <SelectItem key={channel.id} value={channel.id}>
                                        {channel.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {reassignOptions.length === 0 ? (
                            <p className="text-destructive text-sm">
                                Aucun autre canal disponible pour réaffecter les écrans.
                            </p>
                        ) : null}
                    </div>
                ) : null}
                <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirm} variant="destructive" disabled={confirmDisabled}>
                        Supprimer
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
