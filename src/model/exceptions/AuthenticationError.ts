import { Unauthorized } from "@tsed/exceptions";

export class AuthenticationError extends Unauthorized {
    public constructor(message: string, origin?: Error | string) {
        if (message === "Unauthorized") {
            super("Incorrect email/password", origin);
        } else {
            super(message, origin);
        }
    }
}
