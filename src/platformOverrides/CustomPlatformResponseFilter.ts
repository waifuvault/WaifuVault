import { PlatformResponseFilter } from "@tsed/platform-response-filter";
import { BaseContext, Inject, OverrideProvider } from "@tsed/di";
import { ModelTransformationManager } from "../manager/ModelTransformationManager.js";

@OverrideProvider(PlatformResponseFilter)
export class CustomPlatformResponseFilter extends PlatformResponseFilter {
    // must be prop injection and not constructor due to an issue with `@OverrideProvider`
    @Inject()
    private readonly modelTransformationManager: ModelTransformationManager;

    public override async transform(data: unknown, ctx: BaseContext): Promise<unknown> {
        const transformedData = await this.modelTransformationManager.transform(data);
        return transformedData ? transformedData : super.transform(data, ctx);
    }
}
