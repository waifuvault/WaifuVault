import { Injectable, InjectContext, ProviderScope } from "@tsed/di";
import { TRANSFORMER } from "../../../../model/di/tokens.js";
import { ITransformer } from "../../../ITransformer.js";
import { FileUploadModel } from "../../../../model/db/FileUpload.model.js";
import { FileUploadResponseDto } from "../../../../model/dto/FileUploadResponseDto.js";
import type { PlatformContext } from "@tsed/common";

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: TRANSFORMER,
})
export class FileModelTransformer implements ITransformer<FileUploadModel, FileUploadResponseDto> {
    public supportsInput(input: unknown): boolean {
        return input instanceof FileUploadModel;
    }

    @InjectContext()
    protected $ctx?: PlatformContext;

    public transform(input: FileUploadModel): Promise<FileUploadResponseDto> {
        if (this.$ctx) {
            if (typeof this.$ctx.request.query.formatted !== "undefined") {
                return FileUploadResponseDto.fromModel(input, this.$ctx.request.query.formatted === "true", true);
            }
        }
        return FileUploadResponseDto.fromModel(input, true, true);
    }
}
