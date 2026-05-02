import { DisplayClient } from '@/components/screens/display-client';
import { DisplayDebugShell } from '@/components/screens/display-debug-shell';

export default function Page() {
    if (process.env.NODE_ENV === 'development') {
        return <DisplayDebugShell />;
    }

    return <DisplayClient />;
}
