import { fileURLToPath } from "node:url";
import path from "node:path";
import TimeUnit from "../model/constants/TimeUnit.js";
import process from "node:process";
import type { Request } from "express";
import fs from "node:fs/promises";
import type { PlatformMulterFile } from "@tsed/common";
import { FileUploadModel } from "../model/db/FileUpload.model.js";

export class ObjectUtils {
    public static getNumber(source: string): number {
        const matches = source.match(/-?\d+/g);
        return matches && matches[0] ? parseInt(matches[0]) : 0;
    }

    public static enumKeys<O extends object, K extends keyof O = keyof O>(obj: O): K[] {
        return Object.keys(obj).filter(k => !Number.isNaN(k)) as K[];
    }

    public static humanFileSize(bytes: number, si = false, dp = 1): string {
        const thresh = si ? 1000 : 1024;

        if (Math.abs(bytes) < thresh) {
            return bytes + " B";
        }

        const units = si
            ? ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
            : ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];
        let u = -1;
        const r = 10 ** dp;

        do {
            bytes /= thresh;
            ++u;
        } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);

        return bytes.toFixed(dp) + " " + units[u];
    }

    public static timeToHuman(value: number, timeUnit: TimeUnit = TimeUnit.milliseconds): string {
        let seconds: number;
        if (timeUnit === TimeUnit.milliseconds) {
            seconds = Math.round(value / 1000);
        } else if (timeUnit !== TimeUnit.seconds) {
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

    public static convertToMilli(value: number, unit: TimeUnit): number {
        switch (unit) {
            case TimeUnit.seconds:
                return value * 1000;
            case TimeUnit.minutes:
                return value * 60000;
            case TimeUnit.hours:
                return value * 3600000;
            case TimeUnit.days:
                return value * 86400000;
            case TimeUnit.weeks:
                return value * 604800000;
            case TimeUnit.months:
                return value * 2629800000;
            case TimeUnit.years:
                return value * 31556952000;
            case TimeUnit.decades:
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
        const expired = FileUtils.getTImeLeft(entry);
        return expired === null ? false : expired <= 0;
    }

    public static getExtension(file: string): string {
        return path.extname(file).slice(1);
    }

    public static getTImeLeft(entry: FileUploadModel): number | null {
        return entry.expires === null ? null : entry.expires - Date.now();
    }

    public static getTimeLeftBySize(filesize: number): number {
        const ttl = Math.floor(
            (FileUtils.MIN_EXPIRATION - FileUtils.MAX_EXPIRATION) *
                Math.pow(filesize / (Number.parseInt(process.env.FILE_SIZE_UPLOAD_LIMIT_MB!) * 1048576) - 1, 3),
        );
        return ttl < FileUtils.MIN_EXPIRATION ? FileUtils.MIN_EXPIRATION : ttl;
    }

    public static getExpiresBySize(filesize: number, dateToUse = Date.now()): number {
        return dateToUse + this.getTimeLeftBySize(filesize);
    }

    public static async getFilesCount(): Promise<number> {
        try {
            const realFiles = await fs.readdir(filesDir, { withFileTypes: true });
            return realFiles.length;
        } catch {
            return 0;
        }
    }

    public static deleteFile(file: string | PlatformMulterFile, force = true): Promise<void> {
        const toDelete = this.getFilePath(file);
        return fs.rm(toDelete, { recursive: true, force });
    }

    public static async getFileSize(file: string | PlatformMulterFile | FileUploadModel): Promise<number> {
        const f = this.getFilePath(file);
        const stat = await fs.stat(f);
        return stat.size;
    }

    public static getFilePath(file: string | PlatformMulterFile | FileUploadModel): string {
        if (file instanceof FileUploadModel) {
            return file.fullLocationOnDisk;
        }
        return typeof file === "string" ? `${filesDir}/${file}` : file.path;
    }

    public static async fileExists(file: string): Promise<boolean> {
        try {
            await fs.access(file, fs.constants.F_OK);
            return true;
        } catch {
            return false;
        }
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
