import { PlatformResponseFilter } from "@tsed/platform-response-filter";
import { BaseContext, Inject, OverrideProvider } from "@tsed/di";
import { ModelTransformationManager } from "../manager/ModelTransformationManager.js";

@OverrideProvider(PlatformResponseFilter)
export class CustomPlatformResponseFilter extends PlatformResponseFilter {
    public constructor(@Inject() private modelTransformationManager: ModelTransformationManager) {
        super();
    }

    public override async serialize(data: unknown, ctx: BaseContext): Promise<unknown> {
        if (await this.modelTransformationManager.transform(data)) {
            return data;
        }

        return super.serialize(data, ctx);
    }

    public override async transform(data: unknown, ctx: BaseContext): Promise<unknown> {
        const transformedData = await this.modelTransformationManager.transform(ctx.data);
        if (transformedData) {
            return transformedData;
        }

        return super.transform(data, ctx);
    }
}
