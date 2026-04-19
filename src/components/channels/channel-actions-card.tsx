'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { deleteChannel } from '@/actions/channel-actions';
import { ChannelDeleteDialog } from '@/components/channels/channel-delete-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type ReassignChannelOption = {
    id: string;
    name: string;
};

type ChannelActionsCardProps = {
    channelId: string;
    channelName: string;
    screensCount: number;
    reassignOptions: ReassignChannelOption[];
};

export function ChannelActionsCard({
                                       channelId,
                                       channelName,
                                       screensCount,
                                       reassignOptions,
                                   }: ChannelActionsCardProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [open, setOpen] = useState(false);
    const [reassignToChannelId, setReassignToChannelId] = useState('');

    const needsReassign = screensCount > 0;
    const canDelete = !needsReassign || (needsReassign && reassignToChannelId.length > 0);

    const helperText = useMemo(() => {
        if (!needsReassign) {
            return 'Supprimez ce canal si vous ne l\'utilisez plus.';
        }

        if (reassignOptions.length === 0) {
            return 'Impossible de supprimer ce canal: aucun autre canal disponible pour réaffecter les écrans.';
        }

        return 'Ce canal a des écrans rattachés. Sélectionnez un canal de destination avant suppression.';
    }, [needsReassign, reassignOptions.length]);

    const handleDelete = () => {
        if (isPending) return;

        startTransition(async () => {
            const result = await deleteChannel(channelId, {
                reassignToChannelId: reassignToChannelId || undefined,
            });

            if (!result.ok) {
                toast.error(result.message);
                return;
            }

            toast.success('Canal supprimé.');
            setOpen(false);
            router.replace('/dashboard/channels');
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Actions</CardTitle>
                <CardDescription>{helperText}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                {needsReassign ? (
                    <div className="grid gap-2">
                        <p className="text-muted-foreground text-sm">Canal de réaffectation des écrans</p>
                        <Select
                            value={reassignToChannelId}
                            onValueChange={setReassignToChannelId}
                            disabled={reassignOptions.length === 0 || isPending}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Sélectionnez un canal" />
                            </SelectTrigger>
                            <SelectContent align="start">
                                {reassignOptions.map((channel) => (
                                    <SelectItem key={channel.id} value={channel.id}>
                                        {channel.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                ) : null}

                <ChannelDeleteDialog
                    open={open}
                    onOpenChange={setOpen}
                    screensCount={screensCount}
                    reassignToChannelId={reassignToChannelId}
                    onReassignToChannelIdChange={setReassignToChannelId}
                    reassignOptions={reassignOptions}
                    showReassignField={false}
                    onConfirm={handleDelete}
                    confirmDisabled={isPending || !canDelete}
                    keepOpenOnConfirm={true}
                    trigger={
                        <Button
                            variant="destructive"
                            disabled={isPending || (needsReassign && reassignOptions.length === 0)}
                        >
                            Supprimer
                        </Button>
                    }
                    title={<span className="break-all">Supprimer {channelName} ?</span>}
                />
            </CardContent>
        </Card>
    );
}
