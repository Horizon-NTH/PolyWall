export type PresignPutParams = {
    bucket: string;
    key: string;
    contentType: string;
    contentLength: number;
    expiresInSeconds: number;
};

export type PresignGetParams = {
    bucket: string;
    key: string;
    expiresInSeconds: number;
};

export type HeadObjectResult = {
    contentLength: number | null;
    contentType: string | null;
    etag: string | null;
};

export interface StorageService {
    putObject(params: {
        bucket: string;
        key: string;
        body: Buffer | Uint8Array | string;
        contentType: string;
    }): Promise<void>;

    presignPut(params: PresignPutParams): Promise<string>;

    presignGet(params: PresignGetParams): Promise<string>;

    headObject(bucket: string, key: string): Promise<HeadObjectResult | null>;

    deleteObject(bucket: string, key: string): Promise<void>;

    getObjectSample(bucket: string, key: string, maxBytes: number): Promise<Buffer | null>;

    getObjectToFile(params: {
        bucket: string;
        key: string;
        filePath: string;
    }): Promise<void>;

    copyObject(params: {
        bucket: string;
        sourceKey: string;
        destinationKey: string;
    }): Promise<void>;
}
