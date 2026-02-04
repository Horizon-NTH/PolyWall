'use client';

import { useEffect, useTransition } from 'react';
import Link from 'next/link';
import { Controller, type Resolver, useForm, useWatch } from 'react-hook-form';
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
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { UserRole } from '@/generated/prisma/enums';

export type ManagedUserFormValues = {
    fullName: string;
    email: string;
    description: string;
    active: boolean;
    password?: string;
    confirmPassword?: string;
    role?: UserRole;
    organizationId?: string | null;
};

export type ManagedUserFormResult =
    | { ok: true }
    | { ok: false; field?: keyof ManagedUserFormValues | 'root'; message: string };

export type ManagedRoleOption = {
    value: UserRole;
    label: string;
};

export type ManagedOrganizationOption = {
    id: string;
    name: string;
};

type ManagedUserFormProps = {
    mode: 'create' | 'edit';
    resolver: Resolver<ManagedUserFormValues>;
    defaultValues?: Partial<ManagedUserFormValues>;
    cancelHref: string;
    onSubmit: (values: ManagedUserFormValues) => Promise<ManagedUserFormResult>;
    onSuccess: (values: ManagedUserFormValues, result: { ok: true }) => void;
    title: string;
    description: string;
    successMessage: string;
    submitLabel?: string;
    showRole?: boolean;
    roleOptions?: readonly ManagedRoleOption[];
    showOrganization?: boolean;
    organizations?: ManagedOrganizationOption[];
    organizationDisabledMessage?: string;
    isOrganizationEnabled?: (role?: UserRole) => boolean;
    showPasswordFields?: boolean;
};

export function ManagedUserForm({
                                    mode,
                                    resolver,
                                    defaultValues,
                                    cancelHref,
                                    onSubmit,
                                    onSuccess,
                                    title,
                                    description,
                                    successMessage,
                                    submitLabel,
                                    showRole = false,
                                    roleOptions = [],
                                    showOrganization = false,
                                    organizations = [],
                                    organizationDisabledMessage,
                                    isOrganizationEnabled,
                                    showPasswordFields,
                                }: ManagedUserFormProps) {
    const isEdit = mode === 'edit';
    const [isPending, startTransition] = useTransition();

    const form = useForm<ManagedUserFormValues>({
        resolver,
        defaultValues: {
            fullName: '',
            email: '',
            description: '',
            role: roleOptions[0]?.value,
            organizationId: null,
            password: '',
            confirmPassword: '',
            active: true,
            ...defaultValues,
        },
    });

    const role = useWatch({control: form.control, name: 'role'});
    const shouldShowPassword = showPasswordFields ?? !isEdit;
    const isOrgEnabled = showOrganization
        ? isOrganizationEnabled
            ? isOrganizationEnabled(role)
            : true
        : false;

    useEffect(() => {
        if (showOrganization && !isOrgEnabled) {
            form.setValue('organizationId', null);
        }
    }, [showOrganization, isOrgEnabled, form]);

    async function handleSubmit(values: ManagedUserFormValues) {
        form.clearErrors('root');

        const result = await onSubmit(values);
        if (!result.ok) {
            form.setError((result.field ?? 'root') as keyof ManagedUserFormValues, {
                message: result.message,
            });
            return;
        }

        toast.success(successMessage);
        startTransition(() => {
            onSuccess(values, result);
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={form.handleSubmit(handleSubmit)}>
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
                                        Un court contexte sur l&apos;utilisateur.
                                    </FieldDescription>
                                    {fieldState.invalid && (
                                        <FieldError errors={[fieldState.error]} />
                                    )}
                                </Field>
                            )}
                        />

                        {showRole ? (
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
                                                {roleOptions.map((option) => (
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
                        ) : null}

                        {showOrganization ? (
                            <Controller
                                name="organizationId"
                                control={form.control}
                                render={({field, fieldState}) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel>Organisation</FieldLabel>
                                        <Select
                                            value={field.value ?? ''}
                                            onValueChange={(value) => field.onChange(value || null)}
                                            disabled={!isOrgEnabled}
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
                                        {!isOrgEnabled && organizationDisabledMessage ? (
                                            <FieldDescription>
                                                {organizationDisabledMessage}
                                            </FieldDescription>
                                        ) : null}
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />
                        ) : null}

                        {shouldShowPassword ? (
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
                                                L&apos;utilisateur pourra le changer plus tard.
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
                                        {submitLabel ?? (isEdit ? 'Enregistrer' : 'Créer')}
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
