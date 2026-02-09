'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, type Resolver, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { createPlaylist, updatePlaylist } from '@/actions/playlist-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    playlistCreateSchema,
    type PlaylistCreateValues,
    playlistUpdateSchema,
    type PlaylistUpdateValues,
} from '@/schemas/playlist-schema';

type PlaylistFormValues = PlaylistCreateValues;

type PlaylistFormProps = {
    mode: 'create' | 'edit';
    playlistId?: string;
    defaultValues?: Partial<PlaylistUpdateValues>;
    cancelHref: string;
};

export function PlaylistForm({mode, playlistId, defaultValues, cancelHref}: PlaylistFormProps) {
    const router = useRouter();
    const isEdit = mode === 'edit';
    const [isPending, startTransition] = useTransition();

    const resolver = zodResolver(
        isEdit ? playlistUpdateSchema : playlistCreateSchema,
    ) as Resolver<PlaylistFormValues>;

    const form = useForm<PlaylistFormValues>({
        resolver,
        defaultValues: {
            name: '',
            description: '',
            ...defaultValues,
        },
    });

    async function onSubmit(values: PlaylistFormValues) {
        form.clearErrors('root');

        if (isEdit) {
            const result = await updatePlaylist(playlistId ?? '', values);
            if (!result.ok) {
                form.setError((result.field ?? 'root') as keyof PlaylistFormValues, {
                    message: result.message,
                });
                return;
            }

            toast.success('Playlist mise à jour.');
            startTransition(() => {
                router.push(`/dashboard/playlists/${playlistId}`);
            });
            return;
        }

        const result = await createPlaylist(values);
        if (!result.ok) {
            form.setError((result.field ?? 'root') as keyof PlaylistFormValues, {
                message: result.message,
            });
            return;
        }

        toast.success('Playlist créée.');
        startTransition(() => {
            router.push(`/dashboard/playlists/${result.playlistId}`);
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{isEdit ? 'Modifier la playlist' : 'Nouvelle playlist'}</CardTitle>
                <CardDescription>
                    {isEdit
                        ? 'Mettez à jour les informations de votre playlist.'
                        : 'Renseignez les informations de base de votre playlist.'}
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
                                    <Input {...field} id="name" aria-invalid={fieldState.invalid} required />
                                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                                </Field>
                            )}
                        />

                        <Controller
                            name="description"
                            control={form.control}
                            render={({field, fieldState}) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="description">Description</FieldLabel>
                                    <Textarea {...field} id="description" rows={4} aria-invalid={fieldState.invalid}
                                              required />
                                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
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
                                    <Button type="submit" disabled={form.formState.isSubmitting || isPending}>
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
