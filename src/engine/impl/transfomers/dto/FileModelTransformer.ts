import { Injectable, InjectContext, ProviderScope } from "@tsed/di";
import { TRANSFORMER } from "../../../../model/di/tokens.js";
import { ITransformer } from "../../../ITransformer.js";
import { FileUploadModel } from "../../../../model/db/FileUpload.model.js";
import { WaifuFile, WaifuFileWithAlbum } from "../../../../model/dto/WaifuFile.js";
import type { PlatformContext } from "@tsed/platform-http";

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: TRANSFORMER,
})
export class FileModelTransformer implements ITransformer<FileUploadModel, WaifuFile> {
    @InjectContext()
    private $ctx?: PlatformContext;

    public supportsInput(input: unknown): boolean {
        return input instanceof FileUploadModel;
    }

    public transform(input: FileUploadModel): Promise<WaifuFile> {
        if (this.$ctx) {
            if (typeof this.$ctx.request.query.formatted !== "undefined") {
                return Promise.resolve(
                    WaifuFileWithAlbum.fromModelAlbum(input, this.$ctx.request.query.formatted === "true"),
                );
            }
        }
        return Promise.resolve(WaifuFileWithAlbum.fromModelAlbum(input, true));
    }
}
