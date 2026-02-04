'use client';

import { useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, type Resolver, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { createAdmin, updateAdmin } from '@/actions/admin-actions';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { adminCreateSchema, adminUpdateSchema } from '@/schemas/admin-schema';
import { UserRole } from '@/generated/prisma/enums';
import { adminRoleOptions } from '@/lib/roles';

type AdminCreateValues = z.infer<typeof adminCreateSchema>;

type AdminUpdateValues = z.infer<typeof adminUpdateSchema>;
type AdminFormValues = AdminCreateValues | AdminUpdateValues;

type OrganizationOption = {
    id: string;
    name: string;
};

type AdminFormProps = {
    mode: 'create' | 'edit';
    adminId?: string;
    defaultValues?: Partial<AdminCreateValues>;
    organizations: OrganizationOption[];
    cancelHref: string;
};

export function AdminForm({
                              mode,
                              adminId,
                              defaultValues,
                              organizations,
                              cancelHref,
                          }: AdminFormProps) {
    const router = useRouter();
    const isEdit = mode === 'edit';
    const [isPending, startTransition] = useTransition();

    const resolver = zodResolver(
        isEdit ? adminUpdateSchema : adminCreateSchema,
    ) as Resolver<AdminFormValues>;

    const form = useForm<AdminFormValues>({
        resolver,
        defaultValues: {
            fullName: '',
            email: '',
            description: '',
            role: UserRole.ORGANIZATION_ADMIN,
            organizationId: null,
            password: '',
            confirmPassword: '',
            active: true,
            ...defaultValues,
        },
    });

    const role = useWatch({ control: form.control, name: 'role' });
    const shouldShowOrganization = role === UserRole.ORGANIZATION_ADMIN;

    useEffect(() => {
        if (role === UserRole.PLATFORM_SUPER_ADMIN) {
            form.setValue('organizationId', null);
        }
    }, [role, form]);

    async function onSubmit(values: AdminFormValues) {
        form.clearErrors('root');

        const result = isEdit
            ? await updateAdmin(adminId ?? '', values as AdminUpdateValues)
            : await createAdmin(values as AdminCreateValues);

        if (!result.ok) {
            form.setError((result.field ?? 'root') as keyof AdminCreateValues, {message: result.message});
            return;
        }

        toast.success(isEdit ? 'Administrateur mis à jour.' : 'Administrateur créé.');
        startTransition(() => {
            if (isEdit) {
                router.push(`/dashboard/administrators/${adminId}`);
            } else {
                router.push('/dashboard/administrators');
            }
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    {isEdit ? 'Modifier l\'administrateur' : 'Nouvel administrateur'}
                </CardTitle>
                <CardDescription>
                    Gérez l&apos;accès administrateur et l&apos;organisation associée.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <FieldGroup>
                        <Controller
                            name="fullName"
                            control={form.control}
                            render={({field, fieldState}) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="fullName">Nom complet</FieldLabel>
                                    <Input
                                        {...field}
                                        id="fullName"
                                        autoComplete="name"
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
                            name="email"
                            control={form.control}
                            render={({field, fieldState}) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="email">Email</FieldLabel>
                                    <Input
                                        {...field}
                                        id="email"
                                        type="email"
                                        autoComplete="email"
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
                                    <Input
                                        {...field}
                                        id="description"
                                        aria-invalid={fieldState.invalid}
                                        required
                                    />
                                    <FieldDescription>
                                        Un court contexte sur l&apos;administrateur.
                                    </FieldDescription>
                                    {fieldState.invalid && (
                                        <FieldError errors={[fieldState.error]} />
                                    )}
                                </Field>
                            )}
                        />

                        <Controller
                            name="role"
                            control={form.control}
                            render={({field, fieldState}) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel>Rôle</FieldLabel>
                                    <Select
                                        value={field.value}
                                        onValueChange={(value) => field.onChange(value as UserRole)}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Sélectionner un rôle" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {adminRoleOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {fieldState.invalid && (
                                        <FieldError errors={[fieldState.error]} />
                                    )}
                                </Field>
                            )}
                        />

                        <Controller
                            name="organizationId"
                            control={form.control}
                            render={({field, fieldState}) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel>Organisation</FieldLabel>
                                    <Select
                                        value={field.value ?? ''}
                                        onValueChange={(value) => field.onChange(value || null)}
                                        disabled={!shouldShowOrganization}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Sélectionner une organisation" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {organizations.map((organization) => (
                                                <SelectItem key={organization.id} value={organization.id}>
                                                    {organization.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {!shouldShowOrganization ? (
                                        <FieldDescription>
                                            Les super admins ne sont pas rattachés à une organisation.
                                        </FieldDescription>
                                    ) : null}
                                    {fieldState.invalid && (
                                        <FieldError errors={[fieldState.error]} />
                                    )}
                                </Field>
                            )}
                        />

                        {!isEdit ? (
                            <>
                                <Controller
                                    name="password"
                                    control={form.control}
                                    render={({field, fieldState}) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="password">Mot de passe initial</FieldLabel>
                                            <Input
                                                {...field}
                                                id="password"
                                                type="password"
                                                autoComplete="new-password"
                                                aria-invalid={fieldState.invalid}
                                                required
                                            />
                                            <FieldDescription>
                                                L&apos;administrateur pourra le changer plus tard.
                                            </FieldDescription>
                                            {fieldState.invalid && (
                                                <FieldError errors={[fieldState.error]} />
                                            )}
                                        </Field>
                                    )}
                                />

                                <Controller
                                    name="confirmPassword"
                                    control={form.control}
                                    render={({field, fieldState}) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="confirmPassword">
                                                Confirmer le mot de passe
                                            </FieldLabel>
                                            <Input
                                                {...field}
                                                id="confirmPassword"
                                                type="password"
                                                autoComplete="new-password"
                                                aria-invalid={fieldState.invalid}
                                                required
                                            />
                                            {fieldState.invalid && (
                                                <FieldError errors={[fieldState.error]} />
                                            )}
                                        </Field>
                                    )}
                                />
                            </>
                        ) : null}

                        <Controller
                            name="active"
                            control={form.control}
                            render={({field}) => (
                                <Field>
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            id="active"
                                            checked={field.value}
                                            onCheckedChange={(value) => field.onChange(Boolean(value))}
                                        />
                                        <FieldLabel htmlFor="active">Compte actif</FieldLabel>
                                    </div>
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
