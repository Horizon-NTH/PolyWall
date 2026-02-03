'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { deleteAdmin, toggleAdminActive } from '@/actions/admin-actions';
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

type AdminActionsCardProps = {
    adminId: string;
    adminName: string;
    isActive: boolean;
};

export function AdminActionsCard({adminId, adminName, isActive}: AdminActionsCardProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleToggle = () => {
        startTransition(async () => {
            const result = await toggleAdminActive(adminId);
            if (!result.ok) {
                toast.error(result.message);
                return;
            }

            toast.success(isActive ? 'Administrateur désactivé.' : 'Administrateur activé.');
            router.refresh();
        });
    };

    const handleDelete = () => {
        startTransition(async () => {
            const result = await deleteAdmin(adminId);
            if (!result.ok) {
                toast.error(result.message);
                return;
            }

            toast.success('Administrateur supprimé.');
            router.replace('/dashboard/administrators');
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Actions</CardTitle>
                <CardDescription>Gérez le statut de l&apos;administrateur.</CardDescription>
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
                            <AlertDialogTitle>Supprimer {adminName} ?</AlertDialogTitle>
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
