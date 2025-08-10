import { Middleware, MiddlewareMethods } from "@tsed/platform-middlewares";
import { Next } from "@tsed/platform-http";
import { BucketAuthenticationException } from "../../model/exceptions/BucketAuthenticationException.js";
import { Inject } from "@tsed/di";
import { BucketSessionService } from "../../services/BucketSessionService.js";

@Middleware()
export class AuthoriseBucket implements MiddlewareMethods {
    public constructor(@Inject() private bucketSessionService: BucketSessionService) {}

    public use(@Next() next: Next): void {
        if (!this.bucketSessionService.hasActiveSession()) {
            throw new BucketAuthenticationException({
                name: "BucketAuthenticationException",
                message: "Token is required",
                status: 401,
            });
        }
        return next();
    }
}
