import { describe, expect, it } from 'vitest';

import { createInteractiveInterruptionController } from '@/lib/screens/interactive-interruption-controller';

describe('interactive-interruption-controller', () => {
    it('enables the controller only when the feature and URL are both present', () => {
        expect(createInteractiveInterruptionController({
            enabled: true,
            interactiveUrl: 'https://example.com',
            inactivityTimeoutSeconds: 30,
        }).isEnabled).toBe(true);

        expect(createInteractiveInterruptionController({
            enabled: true,
            interactiveUrl: null,
            inactivityTimeoutSeconds: 30,
        }).isEnabled).toBe(false);
    });

    it('exposes no-op interaction hooks for V1', () => {
        const controller = createInteractiveInterruptionController({
            enabled: false,
            interactiveUrl: null,
            inactivityTimeoutSeconds: null,
        });

        expect(controller.notifyUserInteraction()).toBe(false);
        expect(() => controller.dispose()).not.toThrow();
    });
});
