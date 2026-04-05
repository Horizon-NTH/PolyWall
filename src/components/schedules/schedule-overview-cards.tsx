import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ScheduleOverviewCardsProps = {
    channelName: string;
    displayTemplateName: string;
    screensCount: number;
    schedulesCount: number;
};

export function ScheduleOverviewCards({
                                          channelName,
                                          displayTemplateName,
                                          screensCount,
                                          schedulesCount,
                                      }: ScheduleOverviewCardsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
                <CardHeader>
                    <CardTitle>Canal</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">{channelName}</CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Modèle</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">{displayTemplateName}</CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Écrans rattachés</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">{screensCount}</CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Programmations actives</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">{schedulesCount}</CardContent>
            </Card>
        </div>
    );
}
