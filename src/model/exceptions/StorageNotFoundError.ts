export class StorageNotFoundError extends Error {
    public constructor(public readonly key: string) {
        super(`Stored object ${key} was not found`);
        this.name = "StorageNotFoundError";
    }
}
