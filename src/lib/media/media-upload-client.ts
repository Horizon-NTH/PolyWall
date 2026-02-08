'use client';

type UploadIntentResponse = {
    mediaFileId: string;
    mediaItemId: string;
    storageBucket: string;
    objectKey: string;
    uploadUrl: string;
    expiresAt: string;
};

type UploadCompleteResponse = {
    ok: boolean;
};

type UploadIntentPayload = {
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
    title: string;
    description: string;
    durationSeconds: number;
    organizationId?: string;
};

type UploadStage = 'intent' | 'upload' | 'complete';

export class UploadMediaError extends Error {
    readonly stage: UploadStage;
    readonly mediaItemId?: string;
    readonly mediaFileId?: string;

    constructor(params: {
        message: string;
        stage: UploadStage;
        mediaItemId?: string;
        mediaFileId?: string;
    }) {
        super(params.message);
        this.name = 'UploadMediaError';
        this.stage = params.stage;
        this.mediaItemId = params.mediaItemId;
        this.mediaFileId = params.mediaFileId;
    }
}

export function isUploadMediaError(error: unknown): error is UploadMediaError {
    return error instanceof UploadMediaError;
}

async function parseApiError(response: Response, fallbackMessage: string) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    return payload?.error ?? fallbackMessage;
}

async function createUploadIntent(payload: UploadIntentPayload): Promise<UploadIntentResponse> {
    const response = await fetch('/api/media/upload-intents', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(await parseApiError(response, 'Impossible de créer l\'upload.'));
    }

    return response.json();
}

async function uploadToPresignedUrl(uploadUrl: string, file: File) {
    const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {'Content-Type': file.type},
        body: file,
    });

    if (!response.ok) {
        throw new Error('Échec de l\'envoi du fichier vers le stockage.');
    }
}

async function markUploadComplete(payload: {
    mediaFileId: string;
    objectKey: string;
}): Promise<UploadCompleteResponse> {
    const response = await fetch('/api/media/upload-complete', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(await parseApiError(response, 'Validation de l\'upload impossible.'));
    }

    return response.json();
}

export async function uploadMediaWithIntent(payload: {
    file: File;
    title: string;
    description: string;
    durationSeconds: number;
    organizationId?: string;
}) {
    let intent: UploadIntentResponse | null = null;

    try {
        intent = await createUploadIntent({
            fileName: payload.file.name,
            mimeType: payload.file.type,
            fileSizeBytes: payload.file.size,
            title: payload.title,
            description: payload.description,
            durationSeconds: payload.durationSeconds,
            organizationId: payload.organizationId,
        });
    } catch (error) {
        throw new UploadMediaError({
            message: error instanceof Error ? error.message : 'Impossible de créer l\'upload.',
            stage: 'intent',
        });
    }

    try {
        await uploadToPresignedUrl(intent.uploadUrl, payload.file);
    } catch (error) {
        throw new UploadMediaError({
            message: error instanceof Error ? error.message : 'Échec de l\'envoi du fichier vers le stockage.',
            stage: 'upload',
            mediaItemId: intent.mediaItemId,
            mediaFileId: intent.mediaFileId,
        });
    }

    try {
        await markUploadComplete({
            mediaFileId: intent.mediaFileId,
            objectKey: intent.objectKey,
        });
    } catch (error) {
        throw new UploadMediaError({
            message: error instanceof Error ? error.message : 'Validation de l\'upload impossible.',
            stage: 'complete',
            mediaItemId: intent.mediaItemId,
            mediaFileId: intent.mediaFileId,
        });
    }

    return {
        mediaItemId: intent.mediaItemId,
        mediaFileId: intent.mediaFileId,
        objectKey: intent.objectKey,
    };
}
