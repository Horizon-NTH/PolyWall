'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { createOrganization, updateOrganization } from '@/actions/organization-actions';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { organizationSchema } from '@/schemas/organization-schema';

type OrganizationFormValues = z.infer<typeof organizationSchema>;

type OrganizationFormProps = {
    mode: 'create' | 'edit';
    organizationId?: string;
    defaultValues?: OrganizationFormValues;
    cancelHref: string;
};

export function OrganizationForm({
                                     mode,
                                     organizationId,
                                     defaultValues,
                                     cancelHref,
                                 }: OrganizationFormProps) {
    const router = useRouter();
    const isEdit = mode === 'edit';
    const [isPending, startTransition] = useTransition();
    const form = useForm<OrganizationFormValues>({
        resolver: zodResolver(organizationSchema),
        defaultValues: defaultValues ?? {
            name: '',
            description: '',
        },
    });

    async function onSubmit(values: OrganizationFormValues) {
        form.clearErrors('root');
        if (isEdit && !organizationId) {
            form.setError('root', {message: 'Organisation introuvable.'});
            return;
        }

        const result =
            isEdit
                ? await updateOrganization(organizationId ?? '', values)
                : await createOrganization(values);

        if (!result.ok) {
            form.setError(result.field ?? 'root', {message: result.message});
            return;
        }

        toast.success(isEdit ? 'Organisation mise à jour.' : 'Organisation créée.');
        startTransition(() => {
            if (isEdit) {
                router.push(cancelHref);
            } else {
                router.push('/dashboard/organizations');
            }
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    {isEdit ? 'Modifier l\'organisation' : 'Nouvelle organisation'}
                </CardTitle>
                <CardDescription>
                    Renseignez les informations principales de l&apos;organisation.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <FieldGroup>
                        <Controller
                            name="name"
                            control={form.control}
                            render={({field, fieldState}) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="name">Nom</FieldLabel>
                                    <Input
                                        {...field}
                                        id="name"
                                        autoComplete="organization"
                                        aria-invalid={fieldState.invalid}
                                        required
                                    />
                                    {fieldState.invalid && (
                                        <FieldError errors={[fieldState.error]} />
                                    )}
                                </Field>
                            )}
                        />

                        <Controller
                            name="description"
                            control={form.control}
                            render={({field, fieldState}) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="description">Description</FieldLabel>
                                    <Textarea
                                        {...field}
                                        id="description"
                                        rows={4}
                                        aria-invalid={fieldState.invalid}
                                        required
                                    />
                                    <FieldDescription>
                                        Une description courte et claire.
                                    </FieldDescription>
                                    {fieldState.invalid && (
                                        <FieldError errors={[fieldState.error]} />
                                    )}
                                </Field>
                            )}
                        />

                        <Field>
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="min-h-5 flex-1">
                                    {form.formState.errors.root ? (
                                        <FieldError errors={[form.formState.errors.root]} />
                                    ) : null}
                                </div>
                                <div className="ml-auto flex items-center gap-2">
                                    <Button asChild variant="outline">
                                        <Link href={cancelHref}>Annuler</Link>
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={form.formState.isSubmitting || isPending}
                                    >
                                        {isEdit ? 'Enregistrer' : 'Créer'}
                                    </Button>
                                </div>
                            </div>
                        </Field>
                    </FieldGroup>
                </form>
            </CardContent>
        </Card>
    );
}
