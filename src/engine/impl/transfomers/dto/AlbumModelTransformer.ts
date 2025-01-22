import { Injectable, InjectContext, ProviderScope } from "@tsed/di";
import { TRANSFORMER } from "../../../../model/di/tokens.js";
import type { ITransformer } from "../../../ITransformer.js";
import { AlbumModel } from "../../../../model/db/Album.model.js";
import { AlbumDto } from "../../../../model/dto/AlbumDto.js";
import type { PlatformContext } from "@tsed/common";
import { InternalServerError } from "@tsed/exceptions";
import { PublicAlbumDto } from "../../../../model/dto/PublicAlbumDto.js";

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: TRANSFORMER,
})
export class AlbumModelTransformer implements ITransformer<AlbumModel, AlbumDto | PublicAlbumDto> {
    @InjectContext()
    private $ctx?: PlatformContext;

    public supportsInput(input: unknown): boolean {
        return input instanceof AlbumModel;
    }

    public transform(input: AlbumModel): Promise<AlbumDto | PublicAlbumDto> {
        if (!this.$ctx) {
            throw new InternalServerError("Unable to extract session");
        }
        const token = this.$ctx.request.params?.albumToken ?? null;
        if (token && input.isPublicToken(token)) {
            return Promise.resolve(PublicAlbumDto.fromModel(input));
        }
        return Promise.resolve(AlbumDto.fromModel(input));
    }
}
