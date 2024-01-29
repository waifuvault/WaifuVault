import {HttpErrorRenderObj} from "../utils/typeings";
import {Exception} from "@tsed/exceptions";
import {PlatformResponse} from "@tsed/common";

export interface IHttpErrorRenderEngine<T> {
    /**
     * Get the render template for this exception engine.
     * @param obj
     * @param response
     */
    render(obj: HttpErrorRenderObj, response: PlatformResponse): Promise<T>;

    /**
     * Returns true if this render engine supports the exception thrown by the system
     * @param exception
     */
    supportsError(exception: Exception): boolean;

    getTitle(): string | null;
}
