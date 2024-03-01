import { fileURLToPath } from "node:url";
import path from "node:path";
import type { FileUploadModel } from "../model/db/FileUpload.model.js";
import TIME_UNIT from "../model/constants/TIME_UNIT.js";
import process from "node:process";
import type { Request } from "express";

export class ObjectUtils {
    public static getNumber(source: string): number {
        const matches = source.match(/-?\d+/g);
        return matches && matches[0] ? parseInt(matches[0]) : 0;
    }

    public static timeToHuman(value: number, timeUnit: TIME_UNIT = TIME_UNIT.milliseconds): string {
        let seconds: number;
        if (timeUnit === TIME_UNIT.milliseconds) {
            seconds = Math.round(value / 1000);
        } else if (timeUnit !== TIME_UNIT.seconds) {
            seconds = Math.round(ObjectUtils.convertToMilli(value, timeUnit) / 1000);
        } else {
            seconds = Math.round(value);
        }
        if (Number.isNaN(seconds)) {
            throw new Error("Unknown error");
        }
        const levels: [number, string][] = [
            [Math.floor(seconds / 31536000), "years"],
            [Math.floor((seconds % 31536000) / 86400), "days"],
            [Math.floor(((seconds % 31536000) % 86400) / 3600), "hours"],
            [Math.floor((((seconds % 31536000) % 86400) % 3600) / 60), "minutes"],
            [Math.floor((((seconds % 31536000) % 86400) % 3600) % 60), "seconds"],
        ];
        let returnText = "";

        for (let i = 0, max = levels.length; i < max; i++) {
            if (levels[i][0] === 0) {
                continue;
            }
            returnText += ` ${levels[i][0]} ${levels[i][0] === 1 ? levels[i][1].substr(0, levels[i][1].length - 1) : levels[i][1]}`;
        }
        return returnText.trim();
    }

    public static convertToMilli(value: number, unit: TIME_UNIT): number {
        switch (unit) {
            case TIME_UNIT.seconds:
                return value * 1000;
            case TIME_UNIT.minutes:
                return value * 60000;
            case TIME_UNIT.hours:
                return value * 3600000;
            case TIME_UNIT.days:
                return value * 86400000;
            case TIME_UNIT.weeks:
                return value * 604800000;
            case TIME_UNIT.months:
                return value * 2629800000;
            case TIME_UNIT.years:
                return value * 31556952000;
            case TIME_UNIT.decades:
                return value * 315569520000;
            default:
                return -1;
        }
    }

    public static removeObjectFromArray<T>(arr: T[], predicate: (itm: T) => boolean): void {
        let arrLen = arr.length;
        while (arrLen--) {
            const currentItem = arr[arrLen];
            if (predicate(currentItem)) {
                arr.splice(arrLen, 1);
            }
        }
    }
}

export class FileUtils {
    private static readonly MIN_EXPIRATION = 30 * 24 * 60 * 60 * 1000;
    private static readonly MAX_EXPIRATION = 365 * 24 * 60 * 60 * 1000;

    public static isFileExpired(entry: FileUploadModel): boolean {
        return FileUtils.getTImeLeft(entry) <= 0;
    }

    public static getExtension(file: string): string {
        return path.extname(file).slice(1);
    }

    public static getTImeLeft(entry: FileUploadModel): number {
        return entry.expires - Date.now();
    }

    public static getTimeLeftBySize(filesize: number): number {
        const ttl = Math.floor((FileUtils.MIN_EXPIRATION - FileUtils.MAX_EXPIRATION) * Math.pow(filesize / (Number.parseInt(process.env.FILE_SIZE_UPLOAD_LIMIT_MB!) * 1048576) - 1, 3));
        return ttl < FileUtils.MIN_EXPIRATION ? FileUtils.MIN_EXPIRATION : ttl;
    }

    public static getExpiresBySize(filesize: number): number {
        return Date.now() + this.getTimeLeftBySize(filesize);
    }

    public static isFileCustomExpire(entry: FileUploadModel): boolean {
        return FileUtils.getExpiresBySize(entry.fileSize) != entry.expires - entry.createdAt.getTime();
    }
}

export class NetworkUtils {
    public static getIp(req: Request): string {
        const useCf = process.env.USE_CLOUDFLARE === "true";
        let ip: string;
        if (useCf) {
            ip = req.headers["cf-connecting-ip"] as string;
        } else {
            ip = req.ip as string;
        }
        return this.extractIp(ip);
    }

    private static extractIp(ipString: string): string {
        const ipSplit = ipString.split(":");
        if (ipSplit.length === 1 || (ipSplit.length > 2 && !ipString.includes("]"))) {
            return ipString;
        }
        if (ipSplit.length === 2) {
            return ipSplit[0];
        }
        return ipSplit
            .slice(0, ipSplit.length - 1)
            .join(":")
            .replace(/\[/, "")
            .replace(/]/, "");
    }
}

export const filesDir = `${path.dirname(fileURLToPath(import.meta.url))}/../../files`;
