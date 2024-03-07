import type { IHttpErrorRenderEngine } from "../../IHttpErrorRenderEngine.js";
import { Exception } from "@tsed/exceptions";
import type { HttpErrorRenderObj } from "../../../utils/typeings.js";
import { Injectable, ProviderScope } from "@tsed/di";
import { HTTP_RENDER_ENGINE } from "../../../model/di/tokens.js";

export type DefaultRenderObj = {
    name: string;
    message: string;
    status: number;
};

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: HTTP_RENDER_ENGINE,
})
export class DefaultHttpRenderEngine implements IHttpErrorRenderEngine<DefaultRenderObj, Exception> {
    public render(obj: HttpErrorRenderObj<Exception>): Promise<DefaultRenderObj> {
        return Promise.resolve(this.mapError(obj.internalError));
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public supportsError(_: Exception): boolean {
        return false;
    }

    public mapError(error: Exception): DefaultRenderObj {
        return {
            name: error.origin?.name ?? error.name,
            message: error.message,
            status: error.status ?? 500,
        };
    }
}
