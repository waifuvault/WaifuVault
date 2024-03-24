import { ERROR_PROCESSOR_ENGINE } from "../../../model/di/tokens.js";
import { Injectable, ProviderScope } from "@tsed/di";
import { Exception } from "@tsed/exceptions";
import { ProcessUploadException } from "../../../model/exceptions/ProcessUploadException.js";
import type { IErrorProcessorEngine } from "../../IErrorProcessorEngine.js";
import { HttpErrorRenderObj } from "../../../utils/typeings.js";
import { FileUtils } from "../../../utils/Utils.js";
import path from "node:path";

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: ERROR_PROCESSOR_ENGINE,
})
export class ProcessUploadErrorProcessorEngine implements IErrorProcessorEngine<ProcessUploadException> {
    public supportsError(exception: Exception): boolean {
        return exception instanceof ProcessUploadException;
    }

    public async process(obj: HttpErrorRenderObj<ProcessUploadException>): Promise<boolean> {
        if (obj.internalError.filePath) {
            await FileUtils.deleteFile(path.basename(obj.internalError.filePath), true);
        }
        return true;
    }
}
