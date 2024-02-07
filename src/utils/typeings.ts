import {Exception} from "@tsed/exceptions";

export type HttpErrorRenderObj<T extends Exception> = {
    status: number,
    title: string | null,
    message: string,
    internalError: T
};

type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };
export type XOR<T, U> = (T | U) extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U;

export type EntrySettings = {
    hideFilename?: boolean,
    password?: string
}
