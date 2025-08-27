import process from "process";
import "../../config/envs/index.js";
import { isGhAction } from "../../config/envs/index.js";

export const prefix = "envs.";

/**
 * Env to be used in `@Constant` decorators
 */
export enum GlobalEnv {
    PORT = `${prefix}PORT`,
    SESSION_KEY = `${prefix}SESSION_KEY`,
    HTTPS = `${prefix}HTTPS`,
    HTTPS_PORT = `${prefix}HTTPS_PORT`,
    NODE_ENV = `${prefix}NODE_ENV`,
    BASE_URL = `${prefix}BASE_URL`,
    FILE_SIZE_UPLOAD_LIMIT_MB = `${prefix}FILE_SIZE_UPLOAD_LIMIT_MB`,
    CLAM_PATH = `${prefix}CLAM_PATH`,
    BLOCKED_MIME_TYPES = `${prefix}BLOCKED_MIME_TYPES`,
    VIRUSTOTAL_KEY = `${prefix}VIRUSTOTAL_KEY`,
    VIRUSTOTAL_REPUTATION_LIMIT = `${prefix}VIRUSTOTAL_REPUTATION_LIMIT`,
    DANGEROUS_MIME_TYPES = `${prefix}DANGEROUS_MIME_TYPES`,
    USE_CLOUDFLARE = `${prefix}USE_CLOUDFLARE`,
    MAX_URL_LENGTH = `${prefix}MAX_URL_LENGTH`,
    MS_DEFENDER_PATH = `${prefix}MS_DEFENDER_PATH`,
    CAPTCHA_SITE_KEY = `${prefix}CAPTCHA_SITE_KEY`,
    CAPTCHA_SECRET_KEY = `${prefix}CAPTCHA_SECRET_KEY`,
    FILE_CLEANER_CRON = `${prefix}FILE_CLEANER_CRON`,
    SALT = `${prefix}SALT`,
    UPLOAD_SECRET = `${prefix}UPLOAD_SECRET`,
    RATE_LIMIT = `${prefix}RATE_LIMIT`,
    RATE_LIMIT_MS = `${prefix}RATE_LIMIT_MS`,
    REDIS_URI = `${prefix}REDIS_URI`,
    ZIP_MAX_SIZE_MB = `${prefix}ZIP_MAX_SIZE_MB`,
    IP_SALT = `${prefix}IP_SALT`,
    HOME_PAGE_FILE_COUNTER = `${prefix}HOME_PAGE_FILE_COUNTER`,
    ALBUM_FILE_LIMIT = `${prefix}ALBUM_FILE_LIMIT`,
    TRUSTED_UPLOADER_IPS = `${prefix}TRUSTED_UPLOADER_IPS`,
}

export type GuaranteedString = WithDefault | MandatoryValues;

type DefaultMapping = {
    [K in GlobalEnv]: K extends GuaranteedString ? string : string | null;
};

const baseDefaults = Object.fromEntries(Object.values(GlobalEnv).map(key => [key, null])) as Record<
    GlobalEnv,
    string | null
>;

type MandatoryValues =
    | GlobalEnv.FILE_SIZE_UPLOAD_LIMIT_MB
    | GlobalEnv.SESSION_KEY
    | GlobalEnv.PORT
    | GlobalEnv.BASE_URL
    | GlobalEnv.REDIS_URI;

// what envs must have explicit defaults (aka, no non-nulls)
export type WithDefault =
    | GlobalEnv.HOME_PAGE_FILE_COUNTER
    | GlobalEnv.ZIP_MAX_SIZE_MB
    | GlobalEnv.ALBUM_FILE_LIMIT
    | GlobalEnv.IP_SALT;

export const defaultValues = {
    ...baseDefaults,
    [GlobalEnv.HOME_PAGE_FILE_COUNTER]: "dynamic",
    [GlobalEnv.ZIP_MAX_SIZE_MB]: "512",
    [GlobalEnv.ALBUM_FILE_LIMIT]: "256",
    [GlobalEnv.IP_SALT]: "",
    // mandatory
    [GlobalEnv.FILE_SIZE_UPLOAD_LIMIT_MB]: "",
    [GlobalEnv.SESSION_KEY]: "",
    [GlobalEnv.PORT]: "",
    [GlobalEnv.BASE_URL]: "",
    [GlobalEnv.REDIS_URI]: "",
} satisfies DefaultMapping & Record<MandatoryValues, string>;

const mandatoryValues: MandatoryValues[] = [
    GlobalEnv.FILE_SIZE_UPLOAD_LIMIT_MB,
    GlobalEnv.SESSION_KEY,
    GlobalEnv.PORT,
    GlobalEnv.BASE_URL,
    GlobalEnv.REDIS_URI,
];

function validateMandatoryValues(): void {
    if (isGhAction) {
        return;
    }
    const missing: string[] = [];

    for (const key of mandatoryValues) {
        const value = process.env[key.split("envs.").pop() as string];
        if (!value) {
            missing.push(key);
        }
    }

    if (missing.length > 0) {
        throw new Error(`Missing mandatory env(s): ${missing.join(", ")}`);
    }
}

validateMandatoryValues();
