import {Catch, ExceptionFilterMethods, PlatformContext} from "@tsed/common";
import {PassportException} from "@tsed/passport";
import {Inject} from "@tsed/di";
import {HttpExceptionFilter} from "./HttpExceptionFilter";
import {Unauthorized} from "@tsed/exceptions";

@Catch(PassportException)
export class PassportExceptionFilter implements ExceptionFilterMethods<PassportException> {

    @Inject()
    private httpExceptionFilter: HttpExceptionFilter;

    public catch(exception: PassportException, ctx: PlatformContext): unknown {
        if (exception.name === "AuthenticationError") {
            return this.httpExceptionFilter.catch(new Unauthorized("Unauthorized", exception.origin), ctx);
        }
        return this.httpExceptionFilter.catch(exception, ctx);
    }
}
