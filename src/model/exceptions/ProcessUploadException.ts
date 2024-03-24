import { HTTPException } from "@tsed/exceptions";

export class ProcessUploadException extends HTTPException {
    public constructor(
        status: number,
        message?: string,
        public filePath?: string,
        origin?: Error | string,
    ) {
        super(status, message, origin);
    }
}
