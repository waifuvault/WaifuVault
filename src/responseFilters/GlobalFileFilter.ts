import { ResponseFilter, ResponseFilterMethods } from "@tsed/platform-response-filter";
import { Inject } from "@tsed/di";
import { ModelTransformationManager } from "../manager/ModelTransformationManager.js";
import { Context } from "@tsed/platform-params";

@ResponseFilter("*/*")
export class GlobalFileFilter implements ResponseFilterMethods<unknown> {
    public constructor(@Inject() private modelTransformationManager: ModelTransformationManager) {}

    public async transform(data: unknown, ctx: Context): Promise<unknown> {
        if (!ctx.data) {
            return Promise.resolve(data);
        }
        const transformedData = await this.modelTransformationManager.transform(ctx.data);
        if (!transformedData) {
            return data;
        }
        return transformedData;
    }
}
