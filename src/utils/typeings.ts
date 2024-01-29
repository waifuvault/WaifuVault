import {Exception} from "@tsed/exceptions";

export type HttpErrorRenderObj = {
    status: number,
    title: string | null,
    message: string,
    internalError: Exception
};

