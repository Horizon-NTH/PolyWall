'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { deleteDisplayTemplate, duplicateDisplayTemplate } from '@/actions/display-template-actions';
import { DisplayTemplateDeleteDialog } from '@/components/display-templates/display-template-delete-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

type DisplayTemplateActionsCardProps = {
    templateId: string;
    templateName: string;
    channelsCount: number;
    canDuplicate: boolean;
    canDelete: boolean;
};

export function DisplayTemplateActionsCard({
                                               templateId,
                                               templateName,
                                               channelsCount,
                                               canDuplicate,
                                               canDelete,
                                           }: DisplayTemplateActionsCardProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [duplicateName, setDuplicateName] = useState(`${templateName} - copie`);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const duplicate = () => {
        startTransition(async () => {
            const result = await duplicateDisplayTemplate(templateId, {name: duplicateName});
            if (!result.ok) {
                toast.error(result.message);
                return;
            }

            toast.success('Modèle dupliqué.');
            router.push(`/dashboard/display-templates/${result.templateId}`);
        });
    };

    const remove = () => {
        startTransition(async () => {
            const result = await deleteDisplayTemplate(templateId);
            if (!result.ok) {
                toast.error(result.message);
                return;
            }

            toast.success('Modèle supprimé.');
            setIsDeleteOpen(false);
            router.replace('/dashboard/display-templates');
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Actions</CardTitle>
                <CardDescription>
                    Dupliquez un modèle pour le modifier sans affecter les canaux existants.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                {canDuplicate ? (
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="duplicateName">Nom de la copie</FieldLabel>
                            <Input
                                id="duplicateName"
                                value={duplicateName}
                                onChange={(event) => setDuplicateName(event.target.value)}
                            />
                        </Field>
                        <Button type="button" onClick={duplicate}
                                disabled={isPending || duplicateName.trim().length === 0}>
                            Dupliquer
                        </Button>
                    </FieldGroup>
                ) : null}
                {canDelete ? (
                    <FieldGroup className="border-t pt-4">
                        <p className="text-muted-foreground text-sm">
                            {channelsCount > 0
                                ? 'Ce modèle est utilisé par au moins un canal.'
                                : 'Supprimez ce modèle s\'il n\'est plus utilisé.'}
                        </p>
                        <DisplayTemplateDeleteDialog
                            open={isDeleteOpen}
                            onOpenChange={setIsDeleteOpen}
                            channelsCount={channelsCount}
                            onConfirm={remove}
                            confirmDisabled={isPending}
                            trigger={
                                <Button type="button" variant="destructive" disabled={isPending}>
                                    Supprimer
                                </Button>
                            }
                            title={<span className="break-all">Supprimer {templateName} ?</span>}
                        />
                    </FieldGroup>
                ) : null}
            </CardContent>
        </Card>
    );
}
