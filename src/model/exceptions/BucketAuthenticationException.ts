import { PassportException } from "@tsed/passport";
import { PassportAuthenticationError } from "../../utils/typeings.js";

export class BucketAuthenticationException extends PassportException {
    public constructor(error: PassportAuthenticationError) {
        super(error);
    }
}
