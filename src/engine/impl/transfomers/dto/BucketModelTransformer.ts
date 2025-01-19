import { Injectable, InjectContext, ProviderScope } from "@tsed/di";
import { TRANSFORMER } from "../../../../model/di/tokens.js";
import { BucketModel } from "../../../../model/db/Bucket.model.js";
import { ITransformer } from "../../../ITransformer.js";
import { BucketDto } from "../../../../model/dto/BucketDto.js";
import { AdminBucketDto } from "../../../../model/dto/AdminBucketDto.js";
import type { PlatformContext } from "@tsed/common";

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: TRANSFORMER,
})
export class BucketModelTransformer implements ITransformer<BucketModel, BucketDto | AdminBucketDto> {
    public supportsInput(input: unknown): boolean {
        return input instanceof BucketModel;
    }

    @InjectContext()
    protected $ctx?: PlatformContext;

    public transform(input: BucketModel): Promise<BucketDto | AdminBucketDto> {
        if (!this.$ctx) {
            return Promise.resolve(BucketDto.fromModel(input));
        }
        if (this.$ctx.request.url.includes("/admin/bucket")) {
            return Promise.resolve(AdminBucketDto.fromModel(input));
        }

        return Promise.resolve(BucketDto.fromModel(input));
    }
}
