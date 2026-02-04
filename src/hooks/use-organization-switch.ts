'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { switchOrganization } from '@/actions/organization-actions';

export function useOrganizationSwitch() {
    const router = useRouter();
    const [isPending, startTransition] = React.useTransition();

    const switchTo = React.useCallback((organizationId: string) => {
        startTransition(async () => {
            const result = await switchOrganization(organizationId);
            if (result?.ok) {
                router.refresh();
                return;
            }
            toast.error('Impossible de changer d\'organisation.');
        });
    }, [router]);

    return {isPending, switchTo};
}
