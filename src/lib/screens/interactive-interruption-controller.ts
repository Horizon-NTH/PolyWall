export type InteractiveInterruptionConfig = {
    enabled: boolean;
    interactiveUrl: string | null;
    inactivityTimeoutSeconds: number | null;
};

export type InteractiveInterruptionController = {
    isEnabled: boolean;
    interactiveUrl: string | null;
    inactivityTimeoutSeconds: number | null;
    notifyUserInteraction: () => false;
    dispose: () => void;
};

export function createInteractiveInterruptionController(
    config: InteractiveInterruptionConfig,
): InteractiveInterruptionController {
    return {
        isEnabled: config.enabled && Boolean(config.interactiveUrl),
        interactiveUrl: config.interactiveUrl,
        inactivityTimeoutSeconds: config.inactivityTimeoutSeconds,
        notifyUserInteraction: () => false,
        dispose: () => {
        },
    };
}
