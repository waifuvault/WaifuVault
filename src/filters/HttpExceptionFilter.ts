import {Catch, ExceptionFilterMethods, PlatformContext} from "@tsed/common";
import {Exception} from "@tsed/exceptions";
import {Inject} from "@tsed/di";
import {HttpErrorFactory} from "../factory/HttpErrorFactory";
import {HttpErrorRenderObj} from "../utils/typeings";

@Catch(Exception)
export class HttpExceptionFilter implements ExceptionFilterMethods<Exception> {

    @Inject()
    private httpErrorFactory: HttpErrorFactory;

    public async catch(exception: Exception, ctx: PlatformContext): Promise<void> {
        const renderEngine = this.httpErrorFactory.getRenderEngine(exception);
        const obj: HttpErrorRenderObj = {
            status: exception.status,
            message: exception.message,
            internalError: exception,
            title: renderEngine.getTitle()
        };
        const response = ctx.response;
        const template = await renderEngine.render(obj, response);
        response.status(exception.status).body(template);
    }

}
