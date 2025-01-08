import { Injectable, ProviderScope } from "@tsed/di";
import { TRANSFORMER } from "../../../../model/di/tokens.js";
import type { ITransformer } from "../../../ITransformer.js";
import { AlbumModel } from "../../../../model/db/Album.model.js";
import { AlbumDto } from "../../../../model/dto/AlbumDto.js";

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: TRANSFORMER,
})
export class AlbumModelTransformer implements ITransformer<AlbumModel, AlbumDto> {
    public constructor() {}

    public supportsInput(input: unknown): boolean {
        return input instanceof AlbumModel;
    }

    public transform(input: AlbumModel): Promise<AlbumDto> {
        return Promise.resolve(AlbumDto.fromModel(input));
    }
}
