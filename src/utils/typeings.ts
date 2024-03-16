import { Exception } from "@tsed/exceptions";
import { FileUploadModel } from "../model/db/FileUpload.model.js";

export type HttpErrorRenderObj<T extends Exception> = {
    status: number;
    message: string;
    internalError: T;
};

type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };
export type XOR<T, U> = T | U extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U;

export type EntrySettings = {
    hideFilename?: boolean;
    password?: string;
};

export type AvScanResult = {
    passed: boolean;
    engineName: string;
    errorCode?: number;
    additionalMessage?: string;
};

export type ReCAPTCHAResponse = {
    success: boolean;
    challenge_ts: string;
    hostname: string;
    "error-codes": string[];
};

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
    recordCount: string;
    recordSize: string;
};
