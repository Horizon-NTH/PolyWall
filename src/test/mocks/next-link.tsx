import React from 'react';
import { vi } from 'vitest';

vi.mock('next/link', () => ({
    __esModule: true,
    default: (props: React.ComponentProps<'a'>) => <a {...props} />,
}));
