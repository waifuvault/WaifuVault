import {PlatformResponse} from "@tsed/common";
import {StatusCodes} from "http-status-codes";
import {ErrorModel} from "../../model/rest/ErrorModel.js";
import {SuccessModel} from "../../model/rest/SuccessModel.js";
import {Returns} from "@tsed/schema";
import {Forbidden} from "@tsed/exceptions";

@Returns(StatusCodes.FORBIDDEN, Forbidden).Description("If your IP has been blocked")
export abstract class BaseRestController {
    protected doError(res: PlatformResponse, message: string, status: StatusCodes): PlatformResponse {
        return res.status(status).body(new ErrorModel(message));
    }

    protected doSuccess(res: PlatformResponse, message: string): PlatformResponse {
        return res.status(StatusCodes.OK).body(new SuccessModel(true, message));
    }
}
