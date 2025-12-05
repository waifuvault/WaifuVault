import { HTTP_RENDER_ENGINE } from "../../../model/di/tokens.js";
import { Injectable, ProviderScope } from "@tsed/di";
import { Exception } from "@tsed/exceptions";
import { FileProtectedException } from "../../../model/exceptions/FileProtectedException.js";
import type { IHttpErrorRenderEngine } from "../../IHttpErrorRenderEngine.js";
import { HttpErrorRenderObj } from "../../../utils/typeings.js";
import { EncryptedRenderException } from "../../../model/rest/EncryptedRenderException.js";

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: HTTP_RENDER_ENGINE,
})
export class FileProtectedRenderEngine implements IHttpErrorRenderEngine<
    EncryptedRenderException,
    FileProtectedException
> {
    public supportsError(exception: Exception): boolean {
        return exception instanceof FileProtectedException;
    }

    public render(obj: HttpErrorRenderObj<FileProtectedException>): Promise<EncryptedRenderException> {
        return Promise.resolve(
            new EncryptedRenderException(
                obj.internalError.name,
                obj.message,
                obj.status,
                obj.internalError.isEncrypted,
            ),
        );
    }
}
