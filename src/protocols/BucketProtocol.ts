import { OnVerify, Protocol } from "@tsed/passport";
import { BucketModel } from "../model/db/Bucket.model.js";
import { BodyParams } from "@tsed/platform-params";
import { BucketDto } from "../model/dto/BucketDto.js";
import { Inject } from "@tsed/di";
import { BucketService } from "../services/BucketService.js";
import { Strategy, VerifyCallback } from "passport-custom";
import { BucketAuthenticationException } from "../model/exceptions/BucketAuthenticationException.js";

@Protocol({
    name: "bucketAuthProvider",
    useStrategy: class BucketStrategy extends Strategy {
        public constructor(_: unknown, verify: VerifyCallback) {
            super(verify);
        }
    },
})
export class BucketProtocol implements OnVerify {
    public constructor(@Inject() private bucketService: BucketService) {}

    public async $onVerify(@BodyParams() bucketDto: BucketDto): Promise<BucketModel> {
        const { token } = bucketDto;
        if (!token) {
            throw new BucketAuthenticationException({
                name: "BucketAuthenticationException",
                message: "Token is missing",
                status: 401,
            });
        }
        const bucket = await this.bucketService.getBucket(token);
        if (!bucket) {
            throw new BucketAuthenticationException({
                name: "BucketAuthenticationException",
                message: `Bucket with ${token} is not found`,
                status: 401,
            });
        }
        return bucket;
    }
}
