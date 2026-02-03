'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { updateProfile } from '@/actions/account-actions';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Field, FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { profileSchema } from '@/schemas/account-schema';

type AccountProfileFormProps = {
    user: {
        name: string
        email: string
    }
};

export function AccountProfileForm({user}: AccountProfileFormProps) {
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const router = useRouter();
    const form = useForm<z.infer<typeof profileSchema>>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            fullName: user.name,
        },
    });

    async function onSubmit(data: z.infer<typeof profileSchema>) {
        form.clearErrors('root');
        setSuccessMessage(null);
        const result = await updateProfile(data);
        if (!result.ok) {
            form.setError(result.field ?? 'root', {message: result.message});
            return;
        }

        setSuccessMessage('Profil mis à jour.');
        router.refresh();
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Profil</CardTitle>
                <CardDescription>
                    Mettez a jour vos informations personnelles.
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
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />

                        <Field>
                            <FieldLabel htmlFor="email">Email</FieldLabel>
                            <Input
                                id="email"
                                type="email"
                                defaultValue={user.email}
                                autoComplete="email"
                                disabled
                            />
                            <FieldDescription>
                                L&apos;email ne peut pas etre modifie pour le moment.
                            </FieldDescription>
                        </Field>

                        <Field>
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="min-h-5 flex-1">
                                    {form.formState.errors.root ? (
                                        <FieldError errors={[form.formState.errors.root]} />
                                    ) : null}
                                    {successMessage ? (
                                        <p className="text-emerald-600 text-sm" role="status">
                                            {successMessage}
                                        </p>
                                    ) : null}
                                </div>
                                <div className="ml-auto">
                                    <Button
                                        type="submit"
                                        disabled={form.formState.isSubmitting}
                                    >
                                        Enregistrer
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
