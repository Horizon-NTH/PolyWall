'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Controller, type Resolver, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Select as SelectPrimitive } from 'radix-ui';
import { AlertTriangleIcon, CheckIcon } from 'lucide-react';
import { toast } from 'sonner';

import { createSchedule, updateSchedule, upsertDefaultSchedule } from '@/actions/schedule-actions';
import { PlaylistPreviewSummary } from '@/components/playlists/playlist-preview-summary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DatePicker } from '@/components/ui/date-picker';
import { Separator } from '@/components/ui/separator';
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
} from '@/components/ui/field';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { TimePicker } from '@/components/ui/time-picker';
import { ScheduleType } from '@/generated/prisma/enums';
import { parseDateOnlyString } from '@/lib/date';
import {
    ALL_DAYS_OF_WEEK,
    getDayOfWeekLabel,
    SCHEDULE_TYPE_LABELS,
    type ScheduleConflict,
} from '@/lib/schedules/schedule-utils';
import { useCurrentReturnTo } from '@/hooks/use-current-return-to';
import { appendQueryParamToHref, appendReturnTo, removeQueryParamFromHref } from '@/lib/return-to';
import {
    scheduleCreateSchema,
    type ScheduleCreateValues,
    scheduleUpdateSchema,
    type ScheduleUpdateValues,
} from '@/schemas/schedule-schema';
import { formatDurationSeconds, minutesToTimeString, timeStringToMinutes } from '@/lib/utils';

type ScheduleFormValues = ScheduleCreateValues;

type ScheduleFormOption = {
    id: string;
    name: string;
    mediaCount?: number;
    totalDurationSeconds?: number;
    previewItems?: Array<{
        title: string;
        thumbUrl: string | null;
    }>;
};

type ScheduleFormProps = {
    mode: 'create' | 'edit';
    scheduleId?: string;
    defaultValues?: Partial<ScheduleUpdateValues>;
    channels: ScheduleFormOption[];
    playlists: ScheduleFormOption[];
    cancelHref: string;
};

const CONFLICT_DRAFT_STORAGE_KEY = 'polywall:schedule-form:conflict-draft';
const CONFLICT_RESTORE_PARAM = 'restoreConflictDraft';

type ConflictDraftSnapshot = {
    route: string;
    mode: 'create' | 'edit';
    scheduleId: string | null;
    values: ScheduleFormValues;
    conflicts: ScheduleConflict[];
    rootErrorMessage: string | null;
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
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentReturnTo = useCurrentReturnTo();
    const isEdit = mode === 'edit';
    const [isPending, startTransition] = useTransition();
    const [detectedConflicts, setDetectedConflicts] = useState<ScheduleConflict[]>([]);

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
            endDate: '',
            daysOfWeek: [],
            ...defaultValues,
        },
    });

    const watchedType = useWatch({control: form.control, name: 'type'});
    const watchedEndMode = useWatch({control: form.control, name: 'endMode'});
    const watchedPlaylistId = useWatch({control: form.control, name: 'playlistId'});
    const watchedStartTime = useWatch({control: form.control, name: 'startTime'});
    const watchedEndTime = useWatch({control: form.control, name: 'endTime'});
    const watchedDate = useWatch({control: form.control, name: 'date'});
    const isDefaultTypeLocked = defaultValues?.type === ScheduleType.DEFAULT;
    const isDefaultSchedule = watchedType === ScheduleType.DEFAULT;
    const typeOptions = isDefaultTypeLocked
        ? [ScheduleType.DEFAULT]
        : [ScheduleType.RECURRING, ScheduleType.EVENT];
    const selectedPlaylist = useMemo(
        () => playlists.find((playlist) => playlist.id === watchedPlaylistId) ?? null,
        [playlists, watchedPlaylistId],
    );
    const formTitle = isDefaultSchedule
        ? isEdit
            ? 'Modifier la playlist par défaut'
            : 'Définir la playlist par défaut'
        : isEdit
            ? 'Modifier la programmation'
            : 'Nouvelle programmation';
    const formDescription = isDefaultSchedule
        ? 'Choisissez la playlist utilisée automatiquement quand aucune autre programmation prioritaire ne s\'applique.'
        : 'Configurez une programmation récurrente ou événementielle pour un canal.';
    const startTimeMaxValue = useMemo(() => {
        if (watchedEndMode !== 'time' || !watchedEndTime) {
            return '23:59';
        }

        const endMinutes = timeStringToMinutes(watchedEndTime);
        return endMinutes <= 1 ? '00:00' : minutesToTimeString(endMinutes - 1);
    }, [watchedEndMode, watchedEndTime]);
    const endTimeMinValue = useMemo(() => {
        if (!watchedStartTime) {
            return '00:01';
        }

        const startMinutes = timeStringToMinutes(watchedStartTime);
        return startMinutes >= ((24 * 60) - 1) ? '24:00' : minutesToTimeString(startMinutes + 1);
    }, [watchedStartTime]);
    const endDateDisabledDays = useMemo(() => {
        if (!watchedDate) {
            return undefined;
        }

        const startDate = parseDateOnlyString(watchedDate);
        if (!startDate) {
            return undefined;
        }

        return {
            before: startDate,
        };
    }, [watchedDate]);
    const conflictRestoreReturnTo = useMemo(
        () => appendQueryParamToHref(currentReturnTo, CONFLICT_RESTORE_PARAM, '1'),
        [currentReturnTo],
    );

    const clearConflictDraftSnapshot = () => {
        if (typeof window === 'undefined') return;
        window.sessionStorage.removeItem(CONFLICT_DRAFT_STORAGE_KEY);
    };

    const saveConflictDraftSnapshot = () => {
        if (typeof window === 'undefined') return;

        const rootErrorMessage = form.formState.errors.root?.message;
        const payload: ConflictDraftSnapshot = {
            route: conflictRestoreReturnTo,
            mode,
            scheduleId: scheduleId ?? null,
            values: form.getValues(),
            conflicts: detectedConflicts,
            rootErrorMessage: typeof rootErrorMessage === 'string' ? rootErrorMessage : null,
        };

        window.history.replaceState(window.history.state, '', conflictRestoreReturnTo);
        window.sessionStorage.setItem(CONFLICT_DRAFT_STORAGE_KEY, JSON.stringify(payload));
    };

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const currentRoute = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
        const hasRestoreFlag = searchParams.get(CONFLICT_RESTORE_PARAM) === '1';
        if (!hasRestoreFlag) {
            return;
        }

        const rawPayload = window.sessionStorage.getItem(CONFLICT_DRAFT_STORAGE_KEY);
        if (!rawPayload) {
            router.replace(removeQueryParamFromHref(currentRoute, CONFLICT_RESTORE_PARAM));
            return;
        }

        try {
            const snapshot = JSON.parse(rawPayload) as ConflictDraftSnapshot;
            const expectedScheduleId = scheduleId ?? null;

            if (
                snapshot.route !== currentRoute
                || snapshot.mode !== mode
                || snapshot.scheduleId !== expectedScheduleId
            ) {
                window.sessionStorage.removeItem(CONFLICT_DRAFT_STORAGE_KEY);
                router.replace(removeQueryParamFromHref(currentRoute, CONFLICT_RESTORE_PARAM));
                return;
            }

            form.reset(snapshot.values);
            setDetectedConflicts(snapshot.conflicts);
            if (snapshot.rootErrorMessage) {
                form.setError('root', {message: snapshot.rootErrorMessage});
            }
        } catch {
        } finally {
            window.sessionStorage.removeItem(CONFLICT_DRAFT_STORAGE_KEY);
            router.replace(removeQueryParamFromHref(currentRoute, CONFLICT_RESTORE_PARAM));
        }
    }, [form, mode, pathname, router, scheduleId, searchParams]);

    useEffect(() => {
        if (watchedEndMode !== 'time' || !watchedEndTime) {
            return;
        }

        if (timeStringToMinutes(watchedEndTime) < timeStringToMinutes(endTimeMinValue)) {
            form.setValue('endTime', endTimeMinValue, {shouldValidate: true});
        }
    }, [endTimeMinValue, form, watchedEndMode, watchedEndTime]);

    useEffect(() => {
        if (!watchedStartTime) {
            return;
        }

        if (timeStringToMinutes(watchedStartTime) > timeStringToMinutes(startTimeMaxValue)) {
            form.setValue('startTime', startTimeMaxValue, {shouldValidate: true});
        }
    }, [form, startTimeMaxValue, watchedStartTime]);

    async function onSubmit(values: ScheduleFormValues) {
        form.clearErrors('root');
        setDetectedConflicts([]);

        const result = values.type === ScheduleType.DEFAULT
            ? await upsertDefaultSchedule(values)
            : isEdit
                ? await updateSchedule(scheduleId ?? '', values)
                : await createSchedule(values);

        if (!result.ok) {
            form.setError((result.field ?? 'root') as keyof ScheduleFormValues, {
                message: result.message,
            });
            setDetectedConflicts(result.conflicts ?? []);
            return;
        }

        toast.success(values.type === ScheduleType.DEFAULT
            ? 'Playlist par défaut enregistrée.'
            : isEdit
                ? 'Programmation mise à jour.'
                : 'Programmation créée.');
        clearConflictDraftSnapshot();

        startTransition(() => {
            router.push(values.type === ScheduleType.DEFAULT
                ? `/dashboard/schedules?channelId=${values.channelId}`
                : isEdit
                    ? cancelHref
                    : `/dashboard/schedules/${result.scheduleId}`);
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{formTitle}</CardTitle>
                <CardDescription>{formDescription}</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <FieldGroup>
                        {!isDefaultTypeLocked ? (
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
                                                form.setValue('date', '');
                                                form.setValue('endDate', '');
                                                form.setValue('daysOfWeek', []);
                                            }}
                                        >
                                            <SelectTrigger id="type" className="w-full"
                                                           aria-invalid={fieldState.invalid}>
                                                <SelectValue placeholder="Sélectionnez un type" />
                                            </SelectTrigger>
                                            <SelectContent align="start">
                                                {typeOptions.map((type) => (
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
                        ) : null}

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
                                    <PlaylistSelectPreview
                                        selectId="playlistId"
                                        value={field.value}
                                        playlists={playlists}
                                        onValueChange={field.onChange}
                                        ariaInvalid={fieldState.invalid}
                                    />
                                    {selectedPlaylist ? (
                                        <FieldDescription>
                                            Playlist sélectionnée : {selectedPlaylist.name}
                                            {' · '}
                                            {selectedPlaylist.mediaCount ?? 0} média{selectedPlaylist.mediaCount === 1 ? '' : 's'}
                                            {' · '}
                                            {formatDurationSeconds(selectedPlaylist.totalDurationSeconds ?? 0)}
                                        </FieldDescription>
                                    ) : null}
                                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                                </Field>
                            )}
                        />

                        {watchedType === ScheduleType.EVENT ? (
                            <div className="grid gap-4 md:grid-cols-2">
                                <Controller
                                    name="date"
                                    control={form.control}
                                    render={({field, fieldState}) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="date">Date de début</FieldLabel>
                                            <DatePicker
                                                value={field.value}
                                                onChange={field.onChange}
                                                aria-invalid={fieldState.invalid}
                                            />
                                            {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                                        </Field>
                                    )}
                                />
                                <Controller
                                    name="endDate"
                                    control={form.control}
                                    render={({field, fieldState}) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="endDate">Date de fin</FieldLabel>
                                            <DatePicker
                                                value={field.value}
                                                onChange={field.onChange}
                                                placeholder="Même jour si vide"
                                                disabledDays={endDateDisabledDays}
                                                clearButton
                                                aria-invalid={fieldState.invalid}
                                            />
                                            <FieldDescription>
                                                Laissez vide pour une programmation sur un seul jour.
                                            </FieldDescription>
                                            {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                                        </Field>
                                    )}
                                />
                            </div>
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
                                                            htmlFor={`day-${day}`}>{getDayOfWeekLabel(day, 'long')}</FieldLabel>
                                                    </Field>
                                                );
                                            })}
                                        </div>
                                        {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                                    </FieldSet>
                                )}
                            />
                        ) : null}

                        {!isDefaultSchedule ? (
                            <>
                                <Controller
                                    name="startTime"
                                    control={form.control}
                                    render={({field, fieldState}) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="startTime">Heure de début</FieldLabel>
                                            <TimePicker
                                                value={field.value}
                                                onChange={field.onChange}
                                                minValue="00:00"
                                                maxValue={startTimeMaxValue}
                                                presets={[{label: 'Début de journée', value: '00:00'}]}
                                                aria-invalid={fieldState.invalid}
                                            />
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
                                                Le mode &quot;durée de la playlist&quot; calcule automatiquement
                                                l&apos;heure de fin à partir de la durée diffusable actuelle de la
                                                playlist.
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
                                                <TimePicker
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    minValue={endTimeMinValue}
                                                    maxValue="24:00"
                                                    presets={[{label: 'Fin de journée', value: '24:00'}]}
                                                    aria-invalid={fieldState.invalid}
                                                />
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
                            {detectedConflicts.length > 0 ? (
                                <Alert variant="destructive" className="mb-3">
                                    <AlertTriangleIcon />
                                    <AlertTitle>Conflit détecté</AlertTitle>
                                    <AlertDescription className="gap-3">
                                        <p>Modifiez les dates, jours ou horaires pour éviter le chevauchement.</p>
                                        {detectedConflicts.map((conflict, index) => (
                                            <div key={`${conflict.scheduleId}-${conflict.conflictingScheduleId}`}>
                                                {index > 0 ? <Separator className="my-3" /> : null}
                                                <p className="font-medium">{conflict.conflictingTitle}</p>
                                                <p className="mt-1">
                                                    {conflict.conflictingType === ScheduleType.EVENT
                                                        ? `Dates en conflit : ${conflict.overlappingDateLabel ?? 'non précisées'}`
                                                        : `Jours en conflit : ${conflict.overlappingDaysLabel}`}
                                                </p>
                                                <p>Horaire en conflit : {conflict.overlappingTimeLabel}</p>
                                                <Link
                                                    className="mt-2 inline-block underline-offset-4 hover:underline"
                                                    href={appendReturnTo(
                                                        `/dashboard/schedules/${conflict.conflictingScheduleId}`,
                                                        conflictRestoreReturnTo,
                                                    )}
                                                    onClick={saveConflictDraftSnapshot}
                                                >
                                                    Voir la programmation en conflit
                                                </Link>
                                            </div>
                                        ))}
                                    </AlertDescription>
                                </Alert>
                            ) : null}
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="min-h-5 flex-1">
                                    {form.formState.errors.root ? (
                                        <FieldError errors={[form.formState.errors.root]} />
                                    ) : null}
                                </div>
                                <div className="ml-auto flex items-center gap-2">
                                    <Button asChild variant="outline">
                                        <Link href={cancelHref} onClick={clearConflictDraftSnapshot}>Annuler</Link>
                                    </Button>
                                    <Button type="submit" disabled={form.formState.isSubmitting || isPending}>
                                        {isDefaultSchedule
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

type PlaylistSelectPreviewProps = {
    selectId: string;
    value: string;
    playlists: ScheduleFormOption[];
    onValueChange: (value: string) => void;
    ariaInvalid?: boolean;
};

function PlaylistSelectPreview({
                                   selectId,
                                   value,
                                   playlists,
                                   onValueChange,
                                   ariaInvalid,
                               }: PlaylistSelectPreviewProps) {
    const selectedPlaylist = playlists.find((playlist) => playlist.id === value) ?? null;

    return (
        <Select value={value} onValueChange={onValueChange}>
            <SelectTrigger id={selectId} className="w-full" aria-invalid={ariaInvalid}>
                {selectedPlaylist ? (
                    <span>{selectedPlaylist.name}</span>
                ) : (
                    <SelectValue placeholder="Sélectionnez une playlist" />
                )}
            </SelectTrigger>
            <SelectContent align="start" position="popper" className="max-w-(--radix-select-trigger-width)">
                {playlists.map((playlist) => (
                    <PlaylistPreviewSelectItem key={playlist.id} playlist={playlist} />
                ))}
            </SelectContent>
        </Select>
    );
}

function PlaylistPreviewSelectItem({playlist}: { playlist: ScheduleFormOption }) {
    return (
        <SelectPrimitive.Item
            value={playlist.id}
            textValue={playlist.name}
            className="focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-default items-center gap-3 rounded-sm py-2 pr-8 pl-2 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50"
        >
            <SelectPrimitive.ItemText>
                <span className="sr-only">{playlist.name}</span>
            </SelectPrimitive.ItemText>
            <PlaylistPreviewSummary
                name={playlist.name}
                mediaCount={playlist.mediaCount ?? 0}
                totalDurationLabel={formatDurationSeconds(playlist.totalDurationSeconds ?? 0)}
                previewItems={(playlist.previewItems ?? []).map((item) => ({thumbUrl: item.thumbUrl}))}
                size="sm"
                className="min-w-0 flex-1"
            />
            <span className="absolute right-2 flex size-3.5 items-center justify-center">
                <SelectPrimitive.ItemIndicator>
                    <CheckIcon className="size-4" />
                </SelectPrimitive.ItemIndicator>
            </span>
        </SelectPrimitive.Item>
    );
}
