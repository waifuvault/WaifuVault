import {fileURLToPath} from 'node:url';
import path from "node:path";
import type {FileUploadModel} from "../model/db/FileUpload.model.js";
import TIME_UNIT from "../model/constants/TIME_UNIT.js";

export class ObjectUtils {

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
            [(((seconds % 31536000) % 86400) % 3600) % 60, "seconds"]
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

    public static getTImeLeft(entry: FileUploadModel): number {
        const maxLifespan: number = Math.floor((FileUtils.MIN_EXPIRATION - FileUtils.MAX_EXPIRATION) * Math.pow((entry.fileSize / (Number.parseInt(process.env.FILE_SIZE_UPLOAD_LIMIT_MB!) * 1048576) - 1), 3));
        const currentEpoch: number = Date.now();
        const maxExpiration: number = maxLifespan + entry.createdAt.getTime();
        return maxExpiration - currentEpoch;
    }
}

export const filesDir = `${path.dirname(fileURLToPath(import.meta.url))}/../../files`;
