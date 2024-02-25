import {Forbidden} from "@tsed/exceptions";

export class FileProtectedException extends Forbidden {
    public constructor(message: string, public readonly isEncrypted: boolean, origin?: Error | string) {
        super(message, origin);
    }
}
