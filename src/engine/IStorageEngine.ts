import type { Readable } from "node:stream";
import type { ByteRange, StorageBackend, StoredObjectInfo } from "../utils/typeings.js";

export interface IStorageEngine {
    get id(): StorageBackend;

    get enabled(): boolean;

    get(key: string, range?: ByteRange): Promise<Readable>;

    getBuffer(key: string): Promise<Buffer>;

    put(key: string, body: Buffer): Promise<void>;

    putFile(key: string, localPath: string): Promise<void>;

    head(key: string): Promise<StoredObjectInfo | null>;

    delete(keys: string[]): Promise<void>;

    softDelete(keys: string[]): Promise<void>;

    list(): AsyncIterable<string>;
}
