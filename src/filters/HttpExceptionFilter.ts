import type { ExceptionFilterMethods, PlatformContext } from "@tsed/common";
import { Catch } from "@tsed/common";
import { Exception } from "@tsed/exceptions";
import { Inject } from "@tsed/di";
import { HttpErrorFactory } from "../factory/HttpErrorFactory.js";
import type { HttpErrorRenderObj } from "../utils/typeings.js";

@Catch(Exception)
export class HttpExceptionFilter implements ExceptionFilterMethods<Exception> {
    public constructor(
        @Inject()
        private httpErrorFactory: HttpErrorFactory,
    ) {}

    public async catch(exception: Exception, ctx: PlatformContext): Promise<void> {
        const renderEngine = this.httpErrorFactory.getRenderEngine(exception);
        const processorEngine = this.httpErrorFactory.getErrorProcessor(exception);
        const obj: HttpErrorRenderObj<Exception> = {
            status: exception.status,
            message: exception.message,
            internalError: exception,
        };
        const response = ctx.response;
        if (processorEngine) {
            await processorEngine.process(obj);
        }
        const template = await renderEngine.render(obj, response);
        response.status(exception.status).body(template);
    }
}
