'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { EyeIcon, EyeOffIcon } from 'lucide-react';

import { changePassword } from '@/actions/account-actions';
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
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { changePasswordSchema } from '@/schemas/account-schema';

export function AccountPasswordForm() {
    const [isCurrentVisible, setIsCurrentVisible] = useState(false);
    const [isNewVisible, setIsNewVisible] = useState(false);
    const [isConfirmVisible, setIsConfirmVisible] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const form = useForm<z.infer<typeof changePasswordSchema>>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        },
    });

    async function onSubmit(data: z.infer<typeof changePasswordSchema>) {
        form.clearErrors('root');
        setSuccessMessage(null);
        const result = await changePassword(data);
        if (!result.ok) {
            form.setError(result.field ?? 'root', {message: result.message});
            return;
        }

        form.reset();
        setSuccessMessage('Mot de passe mis à jour.');
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Mot de passe</CardTitle>
                <CardDescription>
                    Mettez à jour votre mot de passe pour sécuriser votre compte.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <FieldGroup>
                        <PasswordField
                            control={form.control}
                            name="currentPassword"
                            label="Mot de passe actuel"
                            autoComplete="current-password"
                            isVisible={isCurrentVisible}
                            onToggle={() => setIsCurrentVisible((current) => !current)}
                        />
                        <PasswordField
                            control={form.control}
                            name="newPassword"
                            label="Nouveau mot de passe"
                            autoComplete="new-password"
                            isVisible={isNewVisible}
                            onToggle={() => setIsNewVisible((current) => !current)}
                            hint="8 à 128 caractères, évitez les mots courants."
                        />
                        <PasswordField
                            control={form.control}
                            name="confirmPassword"
                            label="Confirmer le mot de passe"
                            autoComplete="new-password"
                            isVisible={isConfirmVisible}
                            onToggle={() => setIsConfirmVisible((current) => !current)}
                        />

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
                                        Mettre à jour
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

type PasswordFieldProps = {
    control: ReturnType<typeof useForm<z.infer<typeof changePasswordSchema>>>['control']
    name: 'currentPassword' | 'newPassword' | 'confirmPassword'
    label: string
    autoComplete: string
    isVisible: boolean
    onToggle: () => void
    hint?: string
};

function PasswordField({
                           control,
                           name,
                           label,
                           autoComplete,
                           isVisible,
                           onToggle,
                           hint,
                       }: PasswordFieldProps) {
    return (
        <Controller
            name={name}
            control={control}
            render={({field, fieldState}) => (
                <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={name}>{label}</FieldLabel>
                    <InputGroup>
                        <InputGroupInput
                            {...field}
                            id={name}
                            type={isVisible ? 'text' : 'password'}
                            autoComplete={autoComplete}
                            aria-invalid={fieldState.invalid}
                            required
                        />
                        <InputGroupAddon align="inline-end">
                            <InputGroupButton
                                aria-label={isVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                                aria-pressed={isVisible}
                                onClick={onToggle}
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                            >
                                {isVisible ? <EyeOffIcon /> : <EyeIcon />}
                            </InputGroupButton>
                        </InputGroupAddon>
                    </InputGroup>
                    {hint ? (
                        <FieldDescription>{hint}</FieldDescription>
                    ) : null}
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
            )}
        />
    );
}
