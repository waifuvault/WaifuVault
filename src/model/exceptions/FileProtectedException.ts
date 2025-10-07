import { Forbidden } from "@tsed/exceptions";

export class FileProtectedException extends Forbidden {
    public constructor(
        message: string,
        public readonly isEncrypted: boolean,
        public readonly url: string,
        origin?: Error | string,
    ) {
        super(message, origin);
    }
}
