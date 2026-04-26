'use client';

import * as React from 'react';

import { DisplayClient } from '@/components/screens/display-client';
import { DisplayDebugPanel } from '@/components/screens/display-debug-panel';
import {
    getDisplayDebugScenario,
    loadDisplayDebugPreset,
    persistDisplayDebugPreset,
    type DisplayDebugPreset,
} from '@/lib/screens/display-debug';

export function DisplayDebugShell() {
    const [debugPreset, setDebugPreset] = React.useState<DisplayDebugPreset>('live');

    React.useEffect(() => {
        setDebugPreset(loadDisplayDebugPreset());
    }, []);

    React.useEffect(() => {
        persistDisplayDebugPreset(debugPreset);
    }, [debugPreset]);

    const debugScenario = React.useMemo(
        () => getDisplayDebugScenario(debugPreset),
        [debugPreset],
    );

    return (
        <>
            <DisplayClient debugScenario={debugScenario} />
            <DisplayDebugPanel
                preset={debugPreset}
                onPresetChange={setDebugPreset}
            />
        </>
    );
}
