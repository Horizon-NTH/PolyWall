import { createHash } from 'node:crypto';

export function hashPairingToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
}

export function buildPendingScreenName(deviceId: string) {
    return `Écran en attente ${deviceId.slice(0, 8).toUpperCase()}`;
}
