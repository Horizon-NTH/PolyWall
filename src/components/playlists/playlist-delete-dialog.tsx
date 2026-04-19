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
import { type PlaylistScheduleImpact } from '@/lib/playlists/playlist-schedule-impact';
import { Separator } from '@/components/ui/separator';

type PlaylistDeleteDialogProps = {
    impactedSchedules: PlaylistScheduleImpact[];
    onConfirm: () => void;
    confirmDisabled?: boolean;
    trigger?: ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    title?: ReactNode;
    descriptionPrefix?: ReactNode;
};

export function PlaylistDeleteDialog({
                                         impactedSchedules,
                                         onConfirm,
                                         confirmDisabled = false,
                                         trigger,
                                         open,
                                         onOpenChange,
                                         title = 'Supprimer cette playlist ?',
                                         descriptionPrefix = 'Cette action est définitive. Les éléments de la timeline seront supprimés.',
                                     }: PlaylistDeleteDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            {trigger ? <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger> : null}
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {descriptionPrefix}
                        {impactedSchedules.length > 0
                            ? ` ${impactedSchedules.length} programmation${impactedSchedules.length > 1 ? 's seront aussi supprimées' : ' sera aussi supprimée'}.`
                            : ''}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                {impactedSchedules.length > 0 ? (
                    <div className="max-h-60 space-y-2 overflow-y-auto">
                        {impactedSchedules.map((schedule, index) => (
                            <div key={schedule.id} className="text-sm">
                                <p className="font-medium">{schedule.typeLabel}</p>
                                <p className="text-muted-foreground">{schedule.dateLabel}</p>
                                <p className="text-muted-foreground">{schedule.timeLabel}</p>
                                {index < impactedSchedules.length - 1 ? (
                                    <Separator className="mt-2" />
                                ) : null}
                            </div>
                        ))}
                    </div>
                ) : null}
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
