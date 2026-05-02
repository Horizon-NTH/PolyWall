import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DisplayDebugShell } from '@/components/screens/display-debug-shell';

const mocks = vi.hoisted(() => ({
    displayClient: vi.fn(),
    loadDisplayDebugPreset: vi.fn(),
    persistDisplayDebugPreset: vi.fn(),
    getDisplayDebugScenario: vi.fn(),
}));

vi.mock('@/components/screens/display-client', () => ({
    DisplayClient: (props: {debugScenario: unknown}) => {
        mocks.displayClient(props);
        return <div data-testid="display-client">client</div>;
    },
}));

vi.mock('@/components/screens/display-debug-panel', () => ({
    DisplayDebugPanel: (props: {preset: string; onPresetChange: (preset: 'live' | 'playing') => void}) => (
        <div>
            <span data-testid="debug-preset">{props.preset}</span>
            <button type="button" onClick={() => props.onPresetChange('playing')}>
                mock-playing
            </button>
        </div>
    ),
}));

vi.mock('@/lib/screens/display-debug', () => ({
    loadDisplayDebugPreset: () => mocks.loadDisplayDebugPreset(),
    persistDisplayDebugPreset: (preset: string) => mocks.persistDisplayDebugPreset(preset),
    getDisplayDebugScenario: (preset: string) => mocks.getDisplayDebugScenario(preset),
}));

describe('DisplayDebugShell', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        mocks.displayClient.mockReset();
        mocks.loadDisplayDebugPreset.mockReset();
        mocks.persistDisplayDebugPreset.mockReset();
        mocks.getDisplayDebugScenario.mockReset();
        mocks.loadDisplayDebugPreset.mockReturnValue('degraded');
        mocks.getDisplayDebugScenario.mockImplementation((preset: string) => ({preset}));
    });

    it('loads the persisted preset on mount and renders the matching scenario', async () => {
        await act(async () => {
            render(<DisplayDebugShell />);
        });

        expect(screen.getByTestId('debug-preset')).toHaveTextContent('degraded');
        expect(mocks.displayClient).toHaveBeenLastCalledWith({
            debugScenario: {preset: 'degraded'},
        });
        expect(mocks.persistDisplayDebugPreset).toHaveBeenCalledWith('degraded');
    });

    it('persists preset changes triggered from the debug panel', async () => {
        render(<DisplayDebugShell />);

        fireEvent.click(screen.getByRole('button', {name: 'mock-playing'}));

        expect(screen.getByTestId('debug-preset')).toHaveTextContent('playing');
        expect(mocks.persistDisplayDebugPreset).toHaveBeenLastCalledWith('playing');
        expect(mocks.displayClient).toHaveBeenLastCalledWith({
            debugScenario: {preset: 'playing'},
        });
    });
});
