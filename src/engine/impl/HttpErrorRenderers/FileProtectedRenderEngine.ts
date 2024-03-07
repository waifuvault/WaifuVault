import { HTTP_RENDER_ENGINE } from "../../../model/di/tokens.js";
import { Injectable, ProviderScope } from "@tsed/di";
import { Exception } from "@tsed/exceptions";
import { FileProtectedException } from "../../../model/exceptions/FileProtectedException.js";
import type { IHttpErrorRenderEngine } from "../../IHttpErrorRenderEngine.js";
import { HttpErrorRenderObj } from "../../../utils/typeings.js";
import { PlatformResponse } from "@tsed/common";

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: HTTP_RENDER_ENGINE,
})
export class FileProtectedRenderEngine implements IHttpErrorRenderEngine<string, FileProtectedException> {
    public supportsError(exception: Exception): boolean {
        return exception instanceof FileProtectedException;
    }

    public render(obj: HttpErrorRenderObj<FileProtectedException>, response: PlatformResponse): Promise<string> {
        const isEncrypted = obj.internalError.isEncrypted;
        return response.render("fileLogin.ejs", {
            ...obj,
            isEncrypted,
        });
    }
}
