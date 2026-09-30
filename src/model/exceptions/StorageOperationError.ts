export class StorageOperationError extends Error {
    public constructor(
        public readonly failures: unknown[],
        message: string,
    ) {
        super(message);
        this.name = "StorageOperationError";
    }
}
