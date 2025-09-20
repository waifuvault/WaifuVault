import { Inject, Injectable, InjectContext, ProviderScope } from "@tsed/di";
import { TRANSFORMER } from "../../../../model/di/tokens.js";
import type { ITransformer } from "../../../ITransformer.js";
import { AlbumModel } from "../../../../model/db/Album.model.js";
import { AlbumDto } from "../../../../model/dto/AlbumDto.js";
import type { PlatformContext } from "@tsed/platform-http";
import { InternalServerError } from "@tsed/exceptions";
import { PublicAlbumDto } from "../../../../model/dto/PublicAlbumDto.js";
import { AlbumService } from "../../../../services/AlbumService";

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: TRANSFORMER,
})
export class AlbumModelTransformer implements ITransformer<AlbumModel, AlbumDto | PublicAlbumDto> {
    public constructor(@Inject() private readonly albumService: AlbumService) {}

    @InjectContext()
    private $ctx?: PlatformContext;

    public supportsInput(input: unknown): boolean {
        return input instanceof AlbumModel;
    }

    public async transform(input: AlbumModel): Promise<AlbumDto | PublicAlbumDto> {
        if (!this.$ctx) {
            throw new InternalServerError("Unable to extract session");
        }
        const token = this.$ctx.request.params?.albumToken ?? null;
        if (token && input.isPublicToken(token)) {
            const metadata = await this.albumService.getPublicAlbumMetadata(input.publicToken!);
            return Promise.resolve(PublicAlbumDto.fromModel(input, metadata));
        }
        return Promise.resolve(AlbumDto.fromModel(input));
    }
}
