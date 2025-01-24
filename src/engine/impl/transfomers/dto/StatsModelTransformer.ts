import { Injectable, ProviderScope } from "@tsed/di";
import { TRANSFORMER } from "../../../../model/di/tokens.js";
import type { ITransformer } from "../../../ITransformer.js";
import { StatsDto, StatsModel } from "../../../../model/dto/StatsDto.js";
import { AdminFileData } from "../../../../model/dto/AdminData.js";

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: TRANSFORMER,
})
export class StatsModelTransformer implements ITransformer<StatsModel, StatsDto> {
    public supportsInput(input: unknown): boolean {
        return input instanceof StatsModel;
    }

    public async transform(input: StatsModel): Promise<StatsDto> {
        const entries = await Promise.all(input.files.map(x => AdminFileData.fromModel(x)));
        return StatsDto.buildStats(entries);
    }
}
