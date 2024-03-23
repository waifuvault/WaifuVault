import { ERROR_PROCESSOR_ENGINE } from "../../../model/di/tokens.js";
import { Injectable, ProviderScope } from "@tsed/di";
import { Exception } from "@tsed/exceptions";
import { ProcessUploadException } from "../../../model/exceptions/ProcessUploadException.js";
import type { IErrorProcessorEngine } from "../../IErrorProcessorEngine.js";
import { HttpErrorRenderObj } from "../../../utils/typeings.js";

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: ERROR_PROCESSOR_ENGINE,
})
export class ProcessUploadErrorProcessorEngine implements IErrorProcessorEngine<ProcessUploadException> {
    public supportsError(exception: Exception): boolean {
        return exception instanceof ProcessUploadException;
    }

    public process(obj: HttpErrorRenderObj<ProcessUploadException>): boolean {
        if (obj.status == 500) {
            return false;
        }
        return true;
    }
}
