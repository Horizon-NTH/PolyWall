'use client';

import { useMemo, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, type Resolver, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { createSchedule, updateSchedule, upsertDefaultSchedule } from '@/actions/schedule-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ScheduleType } from '@/generated/prisma/enums';
import {
    ALL_DAYS_OF_WEEK,
    DAY_OF_WEEK_LABELS,
    SCHEDULE_TYPE_LABELS,
} from '@/lib/schedules/schedule-utils';
import {
    scheduleCreateSchema,
    type ScheduleCreateValues,
    scheduleUpdateSchema,
    type ScheduleUpdateValues,
} from '@/schemas/schedule-schema';

type ScheduleFormValues = ScheduleCreateValues;

type ScheduleFormOption = {
    id: string;
    name: string;
    totalDurationSeconds?: number;
};

type ScheduleFormProps = {
    mode: 'create' | 'edit';
    scheduleId?: string;
    defaultValues?: Partial<ScheduleUpdateValues>;
    channels: ScheduleFormOption[];
    playlists: ScheduleFormOption[];
    cancelHref: string;
};

export function ScheduleForm({
                                 mode,
                                 scheduleId,
                                 defaultValues,
                                 channels,
                                 playlists,
                                 cancelHref,
                             }: ScheduleFormProps) {
    const router = useRouter();
    const isEdit = mode === 'edit';
    const [isPending, startTransition] = useTransition();

    const resolver = zodResolver(
        isEdit ? scheduleUpdateSchema : scheduleCreateSchema,
    ) as Resolver<ScheduleFormValues>;

    const form = useForm<ScheduleFormValues>({
        resolver,
        defaultValues: {
            type: ScheduleType.RECURRING,
            channelId: '',
            playlistId: '',
            active: true,
            startTime: '',
            endMode: 'playlist',
            endTime: '',
            date: '',
            daysOfWeek: [],
            ...defaultValues,
        },
    });

    const watchedType = useWatch({control: form.control, name: 'type'});
    const watchedEndMode = useWatch({control: form.control, name: 'endMode'});
    const watchedPlaylistId = useWatch({control: form.control, name: 'playlistId'});
    const selectedPlaylist = useMemo(
        () => playlists.find((playlist) => playlist.id === watchedPlaylistId) ?? null,
        [playlists, watchedPlaylistId],
    );

    async function onSubmit(values: ScheduleFormValues) {
        form.clearErrors('root');

        const result = values.type === ScheduleType.DEFAULT
            ? await upsertDefaultSchedule(values)
            : isEdit
                ? await updateSchedule(scheduleId ?? '', values)
                : await createSchedule(values);

        if (!result.ok) {
            form.setError((result.field ?? 'root') as keyof ScheduleFormValues, {
                message: result.message,
            });
            return;
        }

        toast.success(values.type === ScheduleType.DEFAULT
            ? 'Playlist par défaut enregistrée.'
            : isEdit
                ? 'Programmation mise à jour.'
                : 'Programmation créée.');

        startTransition(() => {
            router.push(values.type === ScheduleType.DEFAULT
                ? `/dashboard/schedules?channelId=${values.channelId}`
                : `/dashboard/schedules/${result.scheduleId}`);
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{isEdit ? 'Modifier la programmation' : 'Nouvelle programmation'}</CardTitle>
                <CardDescription>
                    Configurez une playlist par défaut, récurrente ou événementielle pour un canal.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <FieldGroup>
                        <Controller
                            name="type"
                            control={form.control}
                            render={({field, fieldState}) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="type">Type</FieldLabel>
                                    <Select
                                        value={field.value}
                                        onValueChange={(value) => {
                                            field.onChange(value);
                                            if (value === ScheduleType.DEFAULT) {
                                                form.setValue('date', '');
                                                form.setValue('daysOfWeek', []);
                                                form.setValue('startTime', '');
                                                form.setValue('endTime', '');
                                            }
                                        }}
                                        disabled={isEdit && defaultValues?.type === ScheduleType.DEFAULT}
                                    >
                                        <SelectTrigger id="type" className="w-full" aria-invalid={fieldState.invalid}>
                                            <SelectValue placeholder="Sélectionnez un type" />
                                        </SelectTrigger>
                                        <SelectContent align="start">
                                            {Object.values(ScheduleType).map((type) => (
                                                <SelectItem key={type} value={type}>
                                                    {SCHEDULE_TYPE_LABELS[type]}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                                </Field>
                            )}
                        />

                        <Controller
                            name="channelId"
                            control={form.control}
                            render={({field, fieldState}) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="channelId">Canal</FieldLabel>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger id="channelId" className="w-full"
                                                       aria-invalid={fieldState.invalid}>
                                            <SelectValue placeholder="Sélectionnez un canal" />
                                        </SelectTrigger>
                                        <SelectContent align="start">
                                            {channels.map((channel) => (
                                                <SelectItem key={channel.id} value={channel.id}>
                                                    {channel.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                                </Field>
                            )}
                        />

                        <Controller
                            name="playlistId"
                            control={form.control}
                            render={({field, fieldState}) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="playlistId">Playlist</FieldLabel>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger id="playlistId" className="w-full"
                                                       aria-invalid={fieldState.invalid}>
                                            <SelectValue placeholder="Sélectionnez une playlist" />
                                        </SelectTrigger>
                                        <SelectContent align="start">
                                            {playlists.map((playlist) => (
                                                <SelectItem key={playlist.id} value={playlist.id}>
                                                    {playlist.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {selectedPlaylist?.totalDurationSeconds ? (
                                        <FieldDescription>
                                            Durée totale
                                            actuelle: {Math.ceil(selectedPlaylist.totalDurationSeconds / 60)} min
                                        </FieldDescription>
                                    ) : null}
                                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                                </Field>
                            )}
                        />

                        {watchedType === ScheduleType.EVENT ? (
                            <Controller
                                name="date"
                                control={form.control}
                                render={({field, fieldState}) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="date">Date</FieldLabel>
                                        <Input {...field} id="date" type="date" aria-invalid={fieldState.invalid} />
                                        {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                                    </Field>
                                )}
                            />
                        ) : null}

                        {watchedType === ScheduleType.RECURRING ? (
                            <Controller
                                name="daysOfWeek"
                                control={form.control}
                                render={({field, fieldState}) => (
                                    <FieldSet>
                                        <FieldLegend>Jours de diffusion</FieldLegend>
                                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                            {ALL_DAYS_OF_WEEK.map((day) => {
                                                const checked = field.value.includes(day);
                                                return (
                                                    <Field key={day} orientation="horizontal"
                                                           data-invalid={fieldState.invalid}>
                                                        <Checkbox
                                                            id={`day-${day}`}
                                                            checked={checked}
                                                            onCheckedChange={(value) => {
                                                                const nextValue = value
                                                                    ? [...field.value, day]
                                                                    : field.value.filter((item) => item !== day);
                                                                field.onChange(nextValue);
                                                            }}
                                                        />
                                                        <FieldLabel
                                                            htmlFor={`day-${day}`}>{DAY_OF_WEEK_LABELS[day]}</FieldLabel>
                                                    </Field>
                                                );
                                            })}
                                        </div>
                                        {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                                    </FieldSet>
                                )}
                            />
                        ) : null}

                        {watchedType !== ScheduleType.DEFAULT ? (
                            <>
                                <Controller
                                    name="startTime"
                                    control={form.control}
                                    render={({field, fieldState}) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="startTime">Heure de début</FieldLabel>
                                            <Input {...field} id="startTime" type="time"
                                                   aria-invalid={fieldState.invalid} />
                                            {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                                        </Field>
                                    )}
                                />

                                <Controller
                                    name="endMode"
                                    control={form.control}
                                    render={({field, fieldState}) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="endMode">Fin de diffusion</FieldLabel>
                                            <Select value={field.value} onValueChange={field.onChange}>
                                                <SelectTrigger id="endMode" className="w-full"
                                                               aria-invalid={fieldState.invalid}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent align="start">
                                                    <SelectItem value="time">Heure de fin explicite</SelectItem>
                                                    <SelectItem value="playlist">Durée de la playlist</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FieldDescription>
                                                Le mode "durée de la playlist" calcule automatiquement l&apos;heure de
                                                fin à partir de la durée de la playlist.
                                            </FieldDescription>
                                            {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                                        </Field>
                                    )}
                                />

                                {watchedEndMode === 'time' ? (
                                    <Controller
                                        name="endTime"
                                        control={form.control}
                                        render={({field, fieldState}) => (
                                            <Field data-invalid={fieldState.invalid}>
                                                <FieldLabel htmlFor="endTime">Heure de fin</FieldLabel>
                                                <Input {...field} id="endTime" type="time"
                                                       aria-invalid={fieldState.invalid} />
                                                {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                                            </Field>
                                        )}
                                    />
                                ) : null}
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
                                        <FieldLabel htmlFor="active">Programmation active</FieldLabel>
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
                                    <Button type="submit" disabled={form.formState.isSubmitting || isPending}>
                                        {watchedType === ScheduleType.DEFAULT
                                            ? 'Enregistrer la playlist par défaut'
                                            : isEdit
                                                ? 'Enregistrer'
                                                : 'Créer'}
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
