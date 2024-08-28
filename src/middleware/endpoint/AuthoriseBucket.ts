import { Middleware, MiddlewareMethods } from "@tsed/platform-middlewares";
import { Next, Session } from "@tsed/common";
import { BucketAuthenticationException } from "../../model/exceptions/BucketAuthenticationException.js";

@Middleware()
export class AuthoriseBucket implements MiddlewareMethods {
    public use(@Session() session: Record<string, unknown>, @Next() next: Next): void {
        if (!session || !session.bucket) {
            throw new BucketAuthenticationException({
                name: "BucketAuthenticationException",
                message: "Token is required",
                status: 401,
            });
        }
        return next();
    }
}
