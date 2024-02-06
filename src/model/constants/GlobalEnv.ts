const prefix = "envs.";

/**
 * Env to be used in `@Constant` decorators
 */
enum GlobalEnv {
    PORT = `${prefix}PORT`,
    SESSION_KEY = `${prefix}SESSION_KEY`,
    HTTPS = `${prefix}HTTPS`,
    HTTPS_PORT = `${prefix}HTTPS_PORT`,
    NODE_ENV = `${prefix}NODE_ENV`,
    BASE_URL = `${prefix}BASE_URL`,
    FILE_SIZE_UPLOAD_LIMIT_MB = `${prefix}FILE_SIZE_UPLOAD_LIMIT_MB`,
    CLAM_PATH = `${prefix}CLAM_PATH`,
    BLOCKED_MIME_TYPES = `${prefix}BLOCKED_MIME_TYPES`,
    USE_CLOUDFLARE = `${prefix}USE_CLOUDFLARE`,
    MAX_URL_LENGTH = `${prefix}MAX_URL_LENGTH`
}

export default GlobalEnv;
