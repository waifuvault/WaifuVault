import {Injectable, ProviderScope} from "@tsed/di";
import {HTTP_RENDER_ENGINE} from "../../../model/di/tokens";
import {Exception, Unauthorized} from "@tsed/exceptions";
import {AbstractEjsHttpRenderEngine} from "./AbstractEjsHttpRenderEngine";

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: HTTP_RENDER_ENGINE
})
export class HttpUnauthorizedRenderEngine extends AbstractEjsHttpRenderEngine {

    public override supportsError(exception: Exception): boolean {
        return exception instanceof Unauthorized;
    }

    public override getTitle(): string {
        return "You are not Authorized to view this page.";
    }

}
