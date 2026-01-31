'use client';

import { cn } from '@/lib/utils';
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
    FieldDescription, FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import React, { useState } from 'react';
import {
    Dialog, DialogClose,
    DialogContent,
    DialogDescription, DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { credentialsSchema } from '@/schemas/auth-schema';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

function ForgotPasswordDialog() {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <button type="button" className="ml-auto inline-block text-sm underline-offset-4 hover:underline" tabIndex={3}>
                    Mot de passe oublié ?
                </button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Mot de passe oublié</DialogTitle>
                    <DialogDescription>
                        Si vous avez oublié votre mot de passe, veuillez demander à l&apos;administrateur de votre
                        entité de réinitialiser votre mot de passe.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button>Fermer</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function LoginForm({
                              className,
                              ...props
                          }: React.ComponentProps<'div'>) {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    const form = useForm<z.infer<typeof credentialsSchema>>({
        resolver: zodResolver(credentialsSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    async function onSubmit(data: z.infer<typeof credentialsSchema>) {
        form.clearErrors('root');
        const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';
        const result = await signIn('credentials', {
            ...data,
            callbackUrl,
            redirect: false,
        });

        if (result?.error) {
            form.setError('root', {message: 'Email ou mot de passe incorrect'});
            return;
        }

        router.replace(result?.url ?? callbackUrl);
    }

    return (
        <div className={cn('flex flex-col gap-6', className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle>Bon retour</CardTitle>
                    <CardDescription>
                        Connectez-vous à votre compte
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <FieldGroup>
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
                                            placeholder="m@example.com"
                                            autoFocus
                                            autoComplete="email"
                                            aria-invalid={fieldState.invalid}
                                            required
                                        />
                                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                    </Field>
                                )}
                            />

                            <Controller
                                name="password"
                                control={form.control}
                                render={({field, fieldState}) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <div className="flex items-center">
                                            <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
                                            <ForgotPasswordDialog />
                                        </div>
                                        <InputGroup>
                                            <InputGroupInput
                                                {...field}
                                                id="password"
                                                type={isPasswordVisible ? 'text' : 'password'}
                                                autoComplete="current-password"
                                                aria-invalid={fieldState.invalid}
                                                required
                                            />
                                            <InputGroupAddon align="inline-end">
                                                <InputGroupButton
                                                    aria-label={isPasswordVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                                                    aria-pressed={isPasswordVisible}
                                                    onClick={() => setIsPasswordVisible((current) => !current)}
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon-xs"
                                                >
                                                    {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
                                                </InputGroupButton>
                                            </InputGroupAddon>
                                        </InputGroup>
                                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                    </Field>
                                )}
                            />
                            <Field>
                                <Button
                                    type="submit"
                                    className="bg-blue-dark hover:bg-blue-dark/90"
                                    disabled={form.formState.isSubmitting}
                                >
                                    Se connecter
                                </Button>
                                {form.formState.errors.root ? (
                                    <FieldError errors={[form.formState.errors.root]} />
                                ) : null}
                                <FieldDescription className="text-center">
                                    Besoin d&apos;un compte ?
                                    Contactez l&apos;administrateur de votre entité pour créer un accès.
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
