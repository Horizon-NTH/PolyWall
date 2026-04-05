import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { type ScheduleViewModel } from '@/lib/schedules/schedule-view-model';
import { SCHEDULE_TYPE_LABELS } from '@/lib/schedules/schedule-utils';
import { formatDate } from '@/lib/utils';

type ScheduleSummaryCardProps = {
    schedule: ScheduleViewModel;
};

export function ScheduleSummaryCard({schedule}: ScheduleSummaryCardProps) {
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
                        <p>{schedule.playlistName}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-xs uppercase">Canal</p>
                        <p>{schedule.channelName}</p>
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
