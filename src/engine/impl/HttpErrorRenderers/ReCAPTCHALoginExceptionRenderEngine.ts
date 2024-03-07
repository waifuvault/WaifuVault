import type { IHttpErrorRenderEngine } from "../../IHttpErrorRenderEngine.js";
import { ReCAPTCHAException } from "../../../model/exceptions/ReCAPTCHAException.js";
import { Injectable, InjectContext, ProviderScope } from "@tsed/di";
import { HTTP_RENDER_ENGINE } from "../../../model/di/tokens.js";
import { HttpErrorRenderObj } from "../../../utils/typeings.js";
import { type PlatformContext, PlatformResponse } from "@tsed/common";
import { Exception } from "@tsed/exceptions";

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: HTTP_RENDER_ENGINE,
})
export class ReCAPTCHALoginExceptionRenderEngine implements IHttpErrorRenderEngine<string, ReCAPTCHAException> {
    @InjectContext()
    protected $ctx?: PlatformContext;

    public render(obj: HttpErrorRenderObj<ReCAPTCHAException>, response: PlatformResponse): Promise<string> {
        return response.render("login.ejs", obj);
    }

    public supportsError(exception: Exception): boolean {
        return this.$ctx?.url.includes("/login") ? exception instanceof ReCAPTCHAException : false;
    }
}
