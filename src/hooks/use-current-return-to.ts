'use client';

import { useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function useCurrentReturnTo() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    return useMemo(() => {
        const query = searchParams.toString();
        return query ? `${pathname}?${query}` : pathname;
    }, [pathname, searchParams]);
}
