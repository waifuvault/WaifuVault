import { HTTP_RENDER_ENGINE } from "../../../model/di/tokens.js";
import { Inject, Injectable, ProviderScope } from "@tsed/di";
import { Exception } from "@tsed/exceptions";
import { FileProtectedException } from "../../../model/exceptions/FileProtectedException.js";
import type { IHttpErrorRenderEngine } from "../../IHttpErrorRenderEngine.js";
import { HttpErrorRenderObj } from "../../../utils/typeings.js";
import { PlatformResponse } from "@tsed/common";
import { AbstractEjsRenderEngine } from "./AbstractEjsRenderEngine.js";
import { SettingsService } from "../../../services/SettingsService.js";

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: HTTP_RENDER_ENGINE,
})
export class FileProtectedRenderEngine
    extends AbstractEjsRenderEngine<string>
    implements IHttpErrorRenderEngine<string, FileProtectedException>
{
    public constructor(@Inject() settingsService: SettingsService) {
        super(settingsService);
    }

    public supportsError(exception: Exception): boolean {
        return exception instanceof FileProtectedException;
    }

    public render(obj: HttpErrorRenderObj<FileProtectedException>, response: PlatformResponse): Promise<string> {
        const isEncrypted = obj.internalError.isEncrypted;
        return super.renderWithEnvs("fileLogin.ejs", response, { ...obj, isEncrypted });
    }
}
