import type { PlatformContext } from "@tsed/platform-http";
import { Catch, type ExceptionFilterMethods } from "@tsed/platform-exceptions";
import { PassportException } from "@tsed/passport";
import { Inject } from "@tsed/di";
import { HttpExceptionFilter } from "./HttpExceptionFilter.js";
import { AuthenticationError } from "../model/exceptions/AuthenticationError.js";

@Catch(PassportException)
export class PassportExceptionFilter implements ExceptionFilterMethods<PassportException> {
    public constructor(@Inject() private httpExceptionFilter: HttpExceptionFilter) {}

    public catch(exception: PassportException, ctx: PlatformContext): unknown {
        if (exception.name === "AuthenticationError") {
            return this.httpExceptionFilter.catch(new AuthenticationError(exception.message, exception.origin), ctx);
        }
        return this.httpExceptionFilter.catch(exception, ctx);
    }
}
