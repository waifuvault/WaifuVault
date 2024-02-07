import type {IHttpErrorRenderEngine} from "../../IHttpErrorRenderEngine.js";
import {Exception} from "@tsed/exceptions";
import type {HttpErrorRenderObj} from "../../../utils/typeings.js";
import {PlatformResponse} from "@tsed/common";

export abstract class AbstractEjsHttpRenderEngine<E extends Exception> implements IHttpErrorRenderEngine<string, E> {

    public render(obj: HttpErrorRenderObj<E>, response: PlatformResponse): Promise<string> {
        return response.render("errorPage.ejs", obj);
    }

    public abstract supportsError(exception: Exception): boolean;


    public abstract getTitle(): string;

}
