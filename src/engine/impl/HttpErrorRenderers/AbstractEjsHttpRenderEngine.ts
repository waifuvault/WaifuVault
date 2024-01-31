import {IHttpErrorRenderEngine} from "../../IHttpErrorRenderEngine";
import {Exception} from "@tsed/exceptions";
import {HttpErrorRenderObj} from "../../../model/constants/utils/typeings";
import {PlatformResponse} from "@tsed/common";

export abstract class AbstractEjsHttpRenderEngine implements IHttpErrorRenderEngine<string> {

    public render(obj: HttpErrorRenderObj, response: PlatformResponse): Promise<string> {
        return response.render("errorPage.ejs", obj);
    }

    public abstract supportsError(exception: Exception): boolean;


    public abstract getTitle(): string;

}
