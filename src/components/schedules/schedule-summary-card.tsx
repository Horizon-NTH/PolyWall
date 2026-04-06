'use client';

import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrentReturnTo } from '@/hooks/use-current-return-to';
import { appendReturnTo } from '@/lib/return-to';
import { type ScheduleViewModel } from '@/lib/schedules/schedule-view-model';
import { SCHEDULE_TYPE_LABELS } from '@/lib/schedules/schedule-utils';
import { formatDate } from '@/lib/utils';

type ScheduleSummaryCardProps = {
    schedule: ScheduleViewModel;
};

export function ScheduleSummaryCard({schedule}: ScheduleSummaryCardProps) {
    const currentReturnTo = useCurrentReturnTo();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Informations</CardTitle>
                <CardDescription>Résumé de la programmation et de sa fenêtre de diffusion.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{SCHEDULE_TYPE_LABELS[schedule.type]}</Badge>
                    <Badge variant={schedule.active ? 'default' : 'secondary'}>
                        {schedule.active ? 'Active' : 'Inactive'}
                    </Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                    <div>
                        <p className="text-muted-foreground text-xs uppercase">Playlist</p>
                        <Link
                            href={appendReturnTo(`/dashboard/playlists/${schedule.playlistId}`, currentReturnTo)}
                            className="hover:text-primary inline-flex w-fit underline underline-offset-4"
                        >
                            {schedule.playlistName}
                        </Link>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-xs uppercase">Canal</p>
                        <Link
                            href={appendReturnTo(`/dashboard/channels/${schedule.channelId}`, currentReturnTo)}
                            className="hover:text-primary inline-flex w-fit underline underline-offset-4"
                        >
                            {schedule.channelName}
                        </Link>
                    </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                    <div>
                        <p className="text-muted-foreground text-xs uppercase">Fenêtre</p>
                        <p>{schedule.dateLabel}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-xs uppercase">Horaire</p>
                        <p>{schedule.timeLabel}</p>
                    </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                    <div>
                        <p className="text-muted-foreground text-xs uppercase">Jours</p>
                        <p>{schedule.daysLabel}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-xs uppercase">Créée le</p>
                        <p>{formatDate(new Date(schedule.createdAt))}</p>
                    </div>
                </div>
                <div>
                    <p className="text-muted-foreground text-xs uppercase">Dernière mise à jour</p>
                    <p>{formatDate(new Date(schedule.updatedAt))}</p>
                </div>
            </CardContent>
        </Card>
    );
}
