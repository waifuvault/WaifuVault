import { Middleware, MiddlewareMethods } from "@tsed/platform-middlewares";
import { Next } from "@tsed/platform-http";
import { BucketAuthenticationException } from "../../model/exceptions/BucketAuthenticationException.js";
import { Inject } from "@tsed/di";
import { BucketSessionService } from "../../services/BucketSessionService.js";
import { BucketService } from "../../services/BucketService.js";

@Middleware()
export class AuthoriseBucket implements MiddlewareMethods {
    public constructor(
        @Inject() private bucketSessionService: BucketSessionService,
        @Inject() private bucketService: BucketService,
    ) {}

    public async use(@Next() next: Next): Promise<void> {
        const bucketToken = this.bucketSessionService.getSessionToken();
        if (!bucketToken) {
            throw new BucketAuthenticationException({
                name: "BucketAuthenticationException",
                message: "Token is required",
                status: 401,
            });
        }

        if (!(await this.bucketService.bucketExists(bucketToken))) {
            this.bucketSessionService.destroySession();
            throw new BucketAuthenticationException({
                name: "BucketAuthenticationException",
                message: "Bucket no longer exists",
                status: 401,
            });
        }

        return next();
    }
}
