'use client';

import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrentReturnTo } from '@/hooks/use-current-return-to';
import { appendReturnTo } from '@/lib/return-to';
import { type ScheduleConflict } from '@/lib/schedules/schedule-utils';

type ScheduleConflictsCardProps = {
    conflicts: ScheduleConflict[];
};

export function ScheduleConflictsCard({conflicts}: ScheduleConflictsCardProps) {
    const currentReturnTo = useCurrentReturnTo();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Warnings et conflits</CardTitle>
                <CardDescription>
                    Les conflits détectés concernent des programmations de même priorité qui se chevauchent sur ce
                    canal.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                {conflicts.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Aucun conflit détecté.</p>
                ) : conflicts.map((conflict) => (
                    <div key={`${conflict.scheduleId}-${conflict.conflictingScheduleId}`}
                         className="flex flex-col gap-2 rounded-md border p-3 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="destructive">Conflit</Badge>
                            <span className="font-medium">{conflict.conflictingTitle}</span>
                        </div>
                        <p className="text-muted-foreground">{conflict.message}</p>
                        <div>
                            <Link
                                href={appendReturnTo(
                                    `/dashboard/schedules/${conflict.conflictingScheduleId}`,
                                    currentReturnTo,
                                )}
                                className="underline-offset-4 hover:underline"
                            >
                                Voir la programmation concernée
                            </Link>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
