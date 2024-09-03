import { Middleware, MiddlewareMethods } from "@tsed/platform-middlewares";
import { Next } from "@tsed/common";
import { Inject } from "@tsed/di";
import { BucketService } from "../../services/BucketService.js";
import { BodyParams } from "@tsed/platform-params";
import { BucketDto } from "../../model/dto/BucketDto.js";
import { BucketAuthenticationException } from "../../model/exceptions/BucketAuthenticationException.js";
import { BucketSessionService } from "../../services/BucketSessionService.js";

@Middleware()
export class AuthenticateBucket implements MiddlewareMethods {
    public constructor(
        @Inject() private bucketService: BucketService,
        @Inject() private bucketSessionService: BucketSessionService,
    ) {}

    public async use(@BodyParams() bucketDto: BucketDto, @Next() next: Next): Promise<void> {
        if (!bucketDto) {
            this.throwError(`Payload missing`);
        }
        const { token } = bucketDto;
        if (!token) {
            this.throwError(`Token is missing`);
        }
        const bucket = await this.bucketService.getBucket(token);
        if (!bucket) {
            this.throwError(`Bucket with token ${token} is not found`);
        }

        // we don't want to save the bucket with all the entries into the session, just the token really
        this.bucketSessionService.createSession(bucket);
        return next();
    }

    private throwError(msg: string): never {
        throw new BucketAuthenticationException({
            name: "BucketAuthenticationException",
            message: msg,
            status: 401,
        });
    }
}
