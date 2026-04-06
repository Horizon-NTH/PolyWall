'use client';

import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrentReturnTo } from '@/hooks/use-current-return-to';
import { appendReturnTo } from '@/lib/return-to';
import { type ScheduleViewModel } from '@/lib/schedules/schedule-view-model';

type ScheduleDefaultCardProps = {
    channelId: string;
    defaultSchedule: ScheduleViewModel | null;
};

export function ScheduleDefaultCard({channelId, defaultSchedule}: ScheduleDefaultCardProps) {
    const currentReturnTo = useCurrentReturnTo();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Playlist par défaut</CardTitle>
                <CardDescription>
                    Cette playlist est utilisée automatiquement quand aucune autre programmation prioritaire ne
                    s&apos;applique.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
                {defaultSchedule ? (
                    <>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={defaultSchedule.active ? 'default' : 'secondary'}>
                                {defaultSchedule.active ? 'Active' : 'Inactive'}
                            </Badge>
                            <span className="font-medium">{defaultSchedule.playlistName}</span>
                        </div>
                        <p className="text-muted-foreground">Canal: {defaultSchedule.channelName}</p>
                    </>
                ) : (
                    <p className="text-muted-foreground">
                        Aucune playlist par défaut n&apos;est encore définie pour ce canal.
                    </p>
                )}
            </CardContent>
            <CardFooter>
                <Button asChild>
                    <Link
                        href={appendReturnTo(
                            defaultSchedule
                                ? `/dashboard/schedules/${defaultSchedule.id}/edit`
                                : `/dashboard/schedules/new?channelId=${channelId}&type=DEFAULT`,
                            currentReturnTo,
                        )}
                    >
                        {defaultSchedule ? 'Modifier la playlist par défaut' : 'Définir la playlist par défaut'}
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
