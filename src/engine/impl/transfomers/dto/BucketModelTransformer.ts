import { Injectable, ProviderScope } from "@tsed/di";
import { TRANSFORMER } from "../../../../model/di/tokens.js";
import { BucketModel } from "../../../../model/db/Bucket.model.js";
import { ITransformer } from "../../../ITransformer.js";
import { BucketDto } from "../../../../model/dto/BucketDto.js";

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: TRANSFORMER,
})
export class BucketModelTransformer implements ITransformer<BucketModel, BucketDto> {
    public supportsInput(input: unknown): boolean {
        return input instanceof BucketModel;
    }

    public transform(input: BucketModel): Promise<BucketDto> {
        return Promise.resolve(BucketDto.fromModel(input));
    }
}
