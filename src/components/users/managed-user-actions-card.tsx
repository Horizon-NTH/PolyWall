'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

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

type ManagedUserActionsCardProps = {
    entityLabel: string;
    isActive: boolean;
    onToggle: () => Promise<{ ok: true } | { ok: false; message: string }>;
    onDelete: () => Promise<{ ok: true } | { ok: false; message: string }>;
    onDeletedRedirect: string;
    toggleActiveLabel?: string;
    deleteSuccessLabel?: string;
    description?: string;
};

export function ManagedUserActionsCard({
                                           entityLabel,
                                           isActive,
                                           onToggle,
                                           onDelete,
                                           onDeletedRedirect,
                                           toggleActiveLabel,
                                           deleteSuccessLabel = 'Compte supprimé.',
                                           description = 'Gérez le statut du compte.',
                                       }: ManagedUserActionsCardProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleToggle = () => {
        startTransition(async () => {
            const result = await onToggle();
            if (!result.ok) {
                toast.error(result.message);
                return;
            }

            if (toggleActiveLabel) {
                toast.success(toggleActiveLabel);
            } else {
                toast.success(isActive ? 'Compte désactivé.' : 'Compte activé.');
            }
            router.refresh();
        });
    };

    const handleDelete = () => {
        startTransition(async () => {
            const result = await onDelete();
            if (!result.ok) {
                toast.error(result.message);
                return;
            }

            toast.success(deleteSuccessLabel);
            router.replace(onDeletedRedirect);
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Actions</CardTitle>
                <CardDescription>{description}</CardDescription>
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
                            <AlertDialogTitle className="break-all">Supprimer {entityLabel} ?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Cette action est définitive. Le compte sera supprimé.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                variant="destructive"
                                disabled={isPending}
                            >
                                Supprimer
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
}
