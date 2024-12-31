import { Exception } from "@tsed/exceptions";
import { FileUploadModel } from "../model/db/FileUpload.model.js";
import type { PlatformMulterFile } from "@tsed/common";
import { FileUploadQueryParameters } from "../model/rest/FileUploadQueryParameters.js";
import RestrictionType from "../model/constants/RestrictionType.js";

export type HttpErrorRenderObj<T extends Exception> = {
    status: number;
    message: string;
    internalError: T;
};

export type EntrySettings = {
    hideFilename?: boolean;
    password?: string;
    oneTimeDownload?: boolean;
};

export type AvScanResult = {
    passed: boolean;
    engineName: string;
    errorCode?: number;
    additionalMessage?: string;
};

export type CaptchaResponse = {
    success: boolean;
    /* eslint-disable @typescript-eslint/naming-convention */
    challenge_ts: string;
    hostname: string;
    "error-codes": string[];
};

export type ReCAPTCHAResponse = CaptchaResponse;

export type TurnstileResponse = CaptchaResponse & {
    action: string;
    cdata: string;
};

export type HcaptchaResponse = CaptchaResponse;

export type DatatableOrder = {
    column: number;
    dir: string;
    name: string;
};

export type DatatableSearch = {
    value: string;
    regex: boolean;
};

export type DatatableColumn = {
    data: string;
    name: string;
    searchable: boolean;
    orderable: boolean;
    search: DatatableSearch;
};

export type IpBlockedAwareFileEntry = {
    entry: FileUploadModel;
    ipBlocked: boolean;
};

export type ProtectionLevel = "Encrypted" | "Password" | "None";

export type Awaitable<T> = Promise<T> | T;

export type RecordInfoPayload = {
    recordCount: number;
    recordSize: string;
};

export type FileUploadProps = {
    ip: string;
    source: PlatformMulterFile | string;
    options: FileUploadQueryParameters;
    password?: string;
    secretToken?: string;
    bucketToken?: string;
};

export type PassportAuthenticationError = {
    name: string;
    message: string;
    status: number;
};

export type RestrictionTypeMapping = {
    [RestrictionType.FILE_SIZE_UPLOAD_LIMIT_MB]: number;
    [RestrictionType.BLOCKED_MIME_TYPES]: string;
};

export type RestrictionValueType = string | number | string[];
