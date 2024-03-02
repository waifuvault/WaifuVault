import { PlatformResponse } from "@tsed/common";
import { StatusCodes } from "http-status-codes";
import { ErrorModel } from "../../model/rest/ErrorModel.js";
import { SuccessModel } from "../../model/rest/SuccessModel.js";

export abstract class BaseRestController {
    protected doError(res: PlatformResponse, message: string, status: StatusCodes): PlatformResponse {
        return res.status(status).body(new ErrorModel(message));
    }

    protected doSuccess(res: PlatformResponse, message: string): PlatformResponse {
        return res.status(StatusCodes.OK).body(new SuccessModel(true, message));
    }
}
