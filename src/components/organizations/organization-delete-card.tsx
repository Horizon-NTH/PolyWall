'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { deleteOrganization } from '@/actions/organization-actions';
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

type OrganizationDeleteCardProps = {
    organizationId: string;
    organizationName: string;
    counts: {
        users: number;
        screens: number;
        channels: number;
        playlists: number;
        displayTemplates: number;
        widgetInstances: number;
    };
};

export function OrganizationDeleteCard({
                                           organizationId,
                                           organizationName,
                                           counts,
                                       }: OrganizationDeleteCardProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const hasLinkedData = Object.values(counts).some((value) => value > 0);

    const handleDelete = async () => {
        const result = await deleteOrganization(organizationId);
        if (!result.ok) {
            toast.error(result.message);
            return;
        }

        toast.success('Organisation supprimée.');
        startTransition(() => {
            router.push('/dashboard/organizations');
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Supprimer l&apos;organisation</CardTitle>
                <CardDescription>
                    Cette action est définitive et supprimera l&apos;organisation si aucune donnée
                    n&apos;est liée.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                {hasLinkedData ? (
                    <p className="text-muted-foreground text-sm">
                        Cette organisation contient encore des données.<br />Supprimez d&apos;abord les
                        éléments liés (utilisateurs, écrans, canaux, playlists, templates,
                        widgets).
                    </p>
                ) : (
                    <p className="text-muted-foreground text-sm">
                        Aucun élément lié détecté. Vous pouvez supprimer l&apos;organisation.
                    </p>
                )}
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={hasLinkedData || isPending}>
                            Supprimer
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer cette organisation ?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Vous êtes sur le point de supprimer «{' '}
                                <span
                                    className="inline-block max-w-40 truncate align-bottom"
                                    title={organizationName}
                                >
                                    {organizationName}
                                </span>
                                {' '}».<br /> Cette action est définitive.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete}>
                                Confirmer la suppression
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
}
