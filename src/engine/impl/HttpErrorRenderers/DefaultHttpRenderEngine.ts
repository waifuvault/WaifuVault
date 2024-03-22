import type { IHttpErrorRenderEngine } from "../../IHttpErrorRenderEngine.js";
import { Exception } from "@tsed/exceptions";
import type { HttpErrorRenderObj } from "../../../utils/typeings.js";
import { Injectable, ProviderScope } from "@tsed/di";
import { HTTP_RENDER_ENGINE } from "../../../model/di/tokens.js";
import { DefaultRenderException } from "../../../model/rest/DefaultRenderException.js";

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: HTTP_RENDER_ENGINE,
})
export class DefaultHttpRenderEngine implements IHttpErrorRenderEngine<DefaultRenderException, Exception> {
    public render(obj: HttpErrorRenderObj<Exception>): Promise<DefaultRenderException> {
        return Promise.resolve(this.mapError(obj.internalError));
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public supportsError(_: Exception): boolean {
        return false;
    }

    public mapError(error: Exception): DefaultRenderException {
        return new DefaultRenderException(error.origin?.name ?? error.name, error.message, error.status ?? 500);
    }
}
