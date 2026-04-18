'use client';

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type ChannelOption = {
    id: string;
    name: string;
};

type ChannelScheduleSelectorProps = {
    channels: ChannelOption[];
    selectedChannelId: string;
};

export function ChannelScheduleSelector({channels, selectedChannelId}: ChannelScheduleSelectorProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const serializedSearchParams = useMemo(() => new URLSearchParams(searchParams.toString()), [searchParams]);

    return (
        <Select
            value={selectedChannelId}
            onValueChange={(value) => {
                const params = new URLSearchParams(serializedSearchParams.toString());
                params.set('channelId', value);
                router.push(`${pathname}?${params.toString()}`);
            }}
        >
            <SelectTrigger className="w-full sm:w-66">
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
    );
}
