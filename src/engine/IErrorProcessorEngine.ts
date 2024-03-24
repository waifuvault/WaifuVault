import type { HttpErrorRenderObj } from "../utils/typeings.js";
import { Exception } from "@tsed/exceptions";

export interface IErrorProcessorEngine<E extends Exception> {
    /**
     * Process error
     * @param obj
     */
    process(obj: HttpErrorRenderObj<E>): Promise<boolean>;

    /**
     * Returns true if this render engine supports the exception thrown by the system
     * @param exception
     */
    supportsError(exception: Exception): boolean;
}
