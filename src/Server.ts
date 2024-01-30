import {Configuration, Constant, Inject} from "@tsed/di";
import {BeforeRoutesInit, PlatformApplication} from "@tsed/common";
import "@tsed/platform-express";
import "@tsed/ajv";
import "@tsed/swagger";
// custom index imports
import "./protocols";
import "./filters";
import "./engine/impl/HttpErrorRenderers";
import * as rest from "./controllers/rest";
import "./services/FileCleaner";
// import * as views from "./controllers/views";
// import * as secureViews from "./controllers/secureViews";
// custom index imports end
import {config} from "./config";
import {CustomUserInfoModel} from "./model/auth/CustomUserInfoModel";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import session from "express-session";
import methodOverride from "method-override";
import {isProduction} from "./config/envs";
import helmet from "helmet";
import process from "process";
import cors from "cors";
import {TypeormStore} from "connect-typeorm";
import {SQLITE_DATA_SOURCE} from "./model/di/tokens";
import {DataSource} from "typeorm";
import {SessionModel} from "./model/db/Session.model";
import compression from "compression";
import GlobalEnv from "./model/constants/GlobalEnv";
import multer from "multer";
import path from "path";
import {IpFilterMiddleware} from "./middleware/global/IpFilterMiddleware";
import rateLimit from "express-rate-limit";
import LRUCache = require("lru-cache");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, `${__dirname}/../files`);
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}${path.extname(file.originalname)}`);
    }
});

const opts: Partial<TsED.Configuration> = {
    ...config,
    acceptMimes: ["application/json"],
    httpPort: process.env.PORT ?? 8083,
    httpsPort: (function (): number | boolean {
        if (process.env.HTTPS === "true") {
            return Number.parseInt(process.env.HTTPS_PORT as string);
        }
        return false;
    }()),
    multer: {
        dest: `${__dirname}/../files`,
        limits: {
            fileSize: Number.parseInt(process.env.FILE_SIZE_UPLOAD_LIMIT_MB as string) * 1048576
        },
        storage: storage,
        preservePath: true
    },
    passport: {
        userInfoModel: CustomUserInfoModel
    },
    mount: {
        "/rest": [
            ...Object.values(rest)
        ],
        /* "/": [
            ...Object.values(views)
        ],
        "/secure": [
            ...Object.values(secureViews)
        ] */
    },
    statics: {
        "/f": [
            {
                root: `${__dirname}/../files`
            }
        ],
        "/assets": [
            {
                root: `${__dirname}/public/assets`
            }
        ],
        "/tos": [
            {
                root: `${__dirname}/public/tos.html`
            }
        ],
        "/favicon.ico": [
            {
                // for safari...
                root: `${__dirname}/public/assets/custom/images/favicon.ico`
            }
        ],
        "/robots.txt": [
            {
                root: `${__dirname}/public/robots.txt`
            }
        ]
    },
    socketIO: {
        cors: {
            origin: process.env.BASE_URL
        }
    },
    middlewares: [
        helmet({
            contentSecurityPolicy: false,
            crossOriginEmbedderPolicy: {
                policy: "credentialless"
            }
        }),
        cors({
            origin: process.env.BASE_URL,
            exposedHeaders: ["Location"]
        }),
        cookieParser(),
        methodOverride(),
        bodyParser.json(),
        bodyParser.urlencoded({
            extended: true
        }),
        compression(),
        IpFilterMiddleware,
        rateLimit({
            windowMs: 1000,
            limit: 1,
            message: "You have exceeded your 1 request a second.",
            standardHeaders: true,
            skip: (request) => {
                return !request.path.includes("/rest");
            }
        })
    ],
    views: {
        root: `${__dirname}/public`,
        viewEngine: "ejs",
        extensions: {
            ejs: "ejs"
        },
        options: {
            ejs: {
                rmWhitespace: isProduction,
                cache: isProduction ? LRUCache : null
            }
        }
    },
    swagger: [
        {
            path: "/",
            specVersion: "3.0.3",
            options: {
                withCredentials: true
            }
        }
    ],
    exclude: [
        "**/*.spec.ts"
    ]
};

@Configuration(opts)
export class Server implements BeforeRoutesInit {

    @Inject()
    protected app: PlatformApplication;

    @Configuration()
    protected settings: Configuration;

    @Inject(SQLITE_DATA_SOURCE)
    private ds: DataSource;

    @Constant(GlobalEnv.SESSION_KEY)
    private readonly sessionKey: string;

    @Constant(GlobalEnv.HTTPS)
    private readonly https: string;

    public $beforeRoutesInit(): void | Promise<any> {
        if (isProduction) {
            this.app.getApp().set("trust proxy", 1);
        }
        this.app.use(session({
            secret: this.sessionKey,
            resave: false,
            store: new TypeormStore({
                cleanupLimit: 2,
            }).connect(this.ds.getRepository(SessionModel)),
            saveUninitialized: false,
            cookie: {
                path: "/",
                httpOnly: true,
                maxAge: 86400000,
                secure: this.https === "true",
                sameSite: "strict"
            }
        }));
    }
}
