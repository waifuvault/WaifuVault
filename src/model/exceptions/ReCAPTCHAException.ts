import { BadRequest } from "@tsed/exceptions";

export class ReCAPTCHAException extends BadRequest {
    public constructor(message: string, origin?: Error | string) {
        super(message, origin);
    }
}
