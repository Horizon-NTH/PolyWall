'use client';

import {
    AbilityProvider,
    Can as CaslCan,
    type CanProps,
} from '@casl/react';
import type { AppAbility } from '@/lib/casl/ability';

export { AbilityProvider };

export function Can(props: CanProps<AppAbility>) {
    return <CaslCan<AppAbility> {...props} />;
}
