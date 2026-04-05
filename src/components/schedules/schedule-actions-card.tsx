'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { deleteSchedule } from '@/actions/schedule-actions';
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

type ScheduleActionsCardProps = {
    scheduleId: string;
    scheduleLabel: string;
    returnHref: string;
};

export function ScheduleActionsCard({scheduleId, scheduleLabel, returnHref}: ScheduleActionsCardProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const handleDelete = () => {
        if (isPending) return;

        startTransition(async () => {
            const result = await deleteSchedule(scheduleId);
            if (!result.ok) {
                toast.error(result.message);
                return;
            }

            toast.success('Programmation supprimée.');
            setOpen(false);
            router.push(returnHref);
            router.refresh();
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Actions</CardTitle>
                <CardDescription>Supprimez cette programmation si elle ne doit plus être diffusée.</CardDescription>
            </CardHeader>
            <CardContent>
                <AlertDialog open={open} onOpenChange={setOpen}>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive">Supprimer</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="break-all">Supprimer {scheduleLabel} ?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Cette action est définitive. La priorité retombera automatiquement sur la règle
                                suivante.
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
