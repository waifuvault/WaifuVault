import { Configuration, Inject } from "@tsed/di";
import { BeforeRoutesInit, PlatformApplication } from "@tsed/platform-http";
import "@tsed/platform-express";
import "@tsed/ajv";
import "@tsed/swagger";
import "@tsed/socketio";
import "@tsed/platform-log-request";
import "@tsed/platform-cache";
import "@tsed/ioredis";
import "@tsed/scalar";
// custom index imports
import "./protocols/index.js";
import "./filters/index.js";
import "./engine/impl/index.js";
import * as rest from "./controllers/rest/index.js";
import "./services/FileCleaner.js";
import * as views from "./controllers/views/index.js";
import * as adminViews from "./controllers/secure/views/index.js";
import * as globalMiddleware from "./middleware/global/index.js";
import "./platformOverrides/index.js";
import { FileServerController } from "./controllers/serve/FileServerController.js";
import "./redis/Connection.js";
// import * as secureViews from "./controllers/secureViews";
// custom index imports end
import { config } from "./config/index.js";
import { CustomUserInfoModel } from "./model/auth/CustomUserInfoModel.js";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import session from "express-session";
import methodOverride from "method-override";
import { isGhAction, isProduction } from "./config/envs/index.js";
import helmet from "helmet";
import process from "process";
import e from "cors";
import cors, { CorsRequest } from "cors";
import type { NextFunction, Request, Response } from "express";
import { REDIS_CONNECTION, SQLITE_DATA_SOURCE } from "./model/di/tokens.js";
import { DataSource } from "typeorm";
import compression from "compression";
import multer from "multer";
import path from "node:path";
import rateLimit from "express-rate-limit";
import { LRUCache } from "lru-cache";
import { filesDir, FileUtils, NetworkUtils } from "./utils/Utils.js";
import { fileURLToPath } from "node:url";
import { ExpressRateLimitTypeOrmStore } from "typeorm-rate-limit-store";
import { ExpressRateLimitStoreModel } from "./model/db/ExpressRateLimitStore.model.js";
import { Exception, TooManyRequests } from "@tsed/exceptions";
import { Logger } from "@tsed/logger";
import { DefaultRenderException } from "./model/rest/DefaultRenderException.js";
import { initRedisProvider, type RedisConnection } from "./redis/Connection.js";
import { createShardedAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { RedisStore } from "connect-redis";
import { uuid } from "./utils/uuidUtils.js";
import { GlobalEnv } from "./model/constants/GlobalEnv.js";
import { SettingsService } from "./services/SettingsService.js";

const socketIoStatus = process.env.HOME_PAGE_FILE_COUNTER ? process.env.HOME_PAGE_FILE_COUNTER : "dynamic";

function isPublicPath(path: string): boolean {
    return (
        path.startsWith("/f") ||
        (path.startsWith("/rest") && !path.startsWith("/rest/admin") && !path.startsWith("/rest/auth"))
    );
}

const opts: Partial<TsED.Configuration> = {
    ...config,
    acceptMimes: ["application/json"],
    httpPort: process.env.PORT ?? 8083,
    httpsPort: ((): string | number | false => {
        if (process.env.HTTPS === "true") {
            return Number.parseInt(process.env.HTTPS_PORT as string);
        }
        return false;
    })(),
    multer: {
        dest: filesDir,
        limits: {
            fileSize: Number.parseInt(process.env.FILE_SIZE_UPLOAD_LIMIT_MB as string) * 1048576,
        },
        storage: multer.diskStorage({
            destination: (_, _2, cb) => {
                cb(null, filesDir);
            },
            filename: (_, file, cb) => {
                const ext = FileUtils.getExtension(file.originalname);
                const token = uuid();
                const fileName = ext ? `${token}.${ext}` : token;
                return cb(null, fileName);
            },
        }),
        preservePath: true,
    },
    passport: {
        userInfoModel: CustomUserInfoModel,
    },
    mount: {
        "/rest": [...Object.values(rest)],
        "/": [...Object.values(views)],
        "/f": [FileServerController],
        "/admin": [...Object.values(adminViews)],
    },
    statics: {
        "/assets": [
            {
                root: `${path.dirname(fileURLToPath(import.meta.url))}/public/assets`,
            },
        ],
        "/favicon.ico": [
            {
                // for safari...
                root: `${path.dirname(fileURLToPath(import.meta.url))}/public/assets/custom/images/favicon.ico`,
            },
        ],
        "/robots.txt": [
            {
                root: `${path.dirname(fileURLToPath(import.meta.url))}/public/robots.txt`,
            },
        ],
    },
    socketIO:
        socketIoStatus === "dynamic"
            ? {
                  cors: {
                      origin: [process.env.BASE_URL!, process.env.FRONT_END_URL!],
                  },
              }
            : undefined,
    middlewares: [
        (req: Request, res: Response, next: NextFunction): void => {
            if (isPublicPath(req.path)) {
                return next();
            }
            helmet({
                contentSecurityPolicy: false,
                crossOriginResourcePolicy: {
                    policy: "cross-origin",
                },
                crossOriginEmbedderPolicy: {
                    policy: "credentialless",
                },
            })(req, res, next);
        },
        cors((req: CorsRequest, callback: (err: Error | null, options?: e.CorsOptions) => void) => {
            const corsOptions = isPublicPath((req as Request).path)
                ? {
                      origin: "*",
                      methods: "*",
                      allowedHeaders: "*",
                      exposedHeaders: "*",
                  }
                : {
                      origin: [process.env.BASE_URL!, process.env.FRONT_END_URL!],
                      exposedHeaders: ["Location", "Content-Disposition"],
                      credentials: true,
                  };

            callback(null, corsOptions);
        }),
        cookieParser(),
        methodOverride(),
        bodyParser.json(),
        bodyParser.urlencoded({
            extended: true,
        }),
        compression(),
        ...Object.values(globalMiddleware),
    ],
    views: {
        root: `${path.dirname(fileURLToPath(import.meta.url))}/public`,
        viewEngine: "ejs",
        extensions: {
            ejs: "ejs",
        },
        options: {
            ejs: {
                rmWhitespace: false,
                cache: isProduction ? LRUCache : null,
            },
        },
    },
    scalar: [
        {
            path: "/api-docs-beta",
            specVersion: "3.1.0",
        },
    ],
    swagger: [
        {
            path: "/api-docs",
            specVersion: "3.1.0",
            options: {
                withCredentials: true,
                supportedSubmitMethods: isProduction ? [] : undefined,
            },
        },
    ],
    exclude: ["**/*.spec.ts"],
};

await initRedis(opts);

@Configuration(opts)
export class Server implements BeforeRoutesInit {
    private readonly sessionKey: string;

    private readonly https: string | null;

    private readonly rateLimitMs: string | null;

    private readonly rateLimit: string | null;

    private readonly redisUrl: string | null;

    public constructor(
        @Inject() private app: PlatformApplication,
        @Inject(SQLITE_DATA_SOURCE) private ds: DataSource,
        @Inject() private logger: Logger,
        @Inject(REDIS_CONNECTION) private redis: RedisConnection,
        @Inject() settingsService: SettingsService,
    ) {
        this.sessionKey = settingsService.getSetting(GlobalEnv.SESSION_KEY);
        this.https = settingsService.getSetting(GlobalEnv.HTTPS);
        this.rateLimitMs = settingsService.getSetting(GlobalEnv.RATE_LIMIT_MS);
        this.rateLimit = settingsService.getSetting(GlobalEnv.RATE_LIMIT);
        this.redisUrl = settingsService.getSetting(GlobalEnv.REDIS_URI);
    }

    public $beforeRoutesInit(): void {
        this.app.getApp().set("query parser", "extended");
        if (isProduction) {
            this.app.getApp().set("trust proxy", 1);
        }
        if (this.sessionKey) {
            this.app.use(
                session({
                    secret: this.sessionKey,
                    resave: false,
                    saveUninitialized: false,
                    store: new RedisStore({
                        client: this.redis,
                        prefix: "waifu_session:",
                    }),
                    cookie: {
                        path: "/",
                        httpOnly: true,
                        maxAge: 86400000,
                        secure: this.https === "true",
                        sameSite: "lax",
                        domain: process.env.NODE_ENV === "production" ? process.env.COOKIE_DOMAIN : undefined,
                    },
                }),
            );
        }
        if (this.rateLimit) {
            const howManyRequests = Number.parseInt(this.rateLimit);
            if (Number.isNaN(howManyRequests)) {
                throw new Error("RATE_LIMIT is not a number");
            }
            if (!this.rateLimitMs) {
                throw new Error("RATE_LIMIT_MS is not set");
            }
            const rateLimitTimePeriod = Number.parseInt(this.rateLimitMs);
            if (Number.isNaN(rateLimitTimePeriod)) {
                throw new Error("RATE_LIMIT_MS not a number");
            }
            this.logger.info(`Enable rate limiting: ${howManyRequests} requests every ${rateLimitTimePeriod}ms`);
            this.app.use(
                rateLimit({
                    windowMs: rateLimitTimePeriod,
                    limit: howManyRequests,
                    standardHeaders: true,
                    message: this.parseError(new TooManyRequests("Too many requests, try again later")),
                    skip: request => {
                        if (request?.$ctx?.request?.request?.session?.passport) {
                            return true;
                        }
                        return request.path.includes("/admin") ? true : !request.path.includes("/rest");
                    },
                    keyGenerator: request => {
                        return NetworkUtils.getIp(request);
                    },
                    store: new ExpressRateLimitTypeOrmStore(this.ds.getRepository(ExpressRateLimitStoreModel)),
                }),
            );
        }
        if (this.redisUrl) {
            this.logger.info(`Connected IO to redis at ${this.redisUrl}`);
        }
    }

    private parseError(error: Exception): DefaultRenderException {
        return {
            name: error.origin?.name ?? error.name,
            message: error.message,
            status: error.status ?? 500,
        };
    }
}

async function initRedis(options: Partial<TsED.Configuration>): Promise<void> {
    if (isGhAction) {
        return;
    }
    if (!process.env.REDIS_URI) {
        throw new Error("REDIS_URI is not set");
    }
    initRedisProvider();
    const url = new URL(process.env.REDIS_URI);

    if (socketIoStatus === "dynamic") {
        const pubClient = createClient({
            url: process.env.REDIS_URI as string,
        });
        const subClient = pubClient.duplicate();

        await Promise.all([pubClient.connect(), subClient.connect()]);
        opts.socketIO!.adapter = createShardedAdapter(pubClient, subClient);
    }

    options["ioredis"] = [
        {
            name: "default",
            cache: true,
            host: url.hostname,
            port: Number.parseInt(url.port),
        },
    ];
    options["cache"] = {
        ttl: 300,
    };
}
