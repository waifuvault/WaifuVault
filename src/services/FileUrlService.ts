import { Constant, Inject, Service } from "@tsed/di";
import GlobalEnv from "../model/constants/GlobalEnv.js";
import fetch, { Response } from "node-fetch";
import { BadRequest, Forbidden, HTTPException, RequestURITooLong } from "@tsed/exceptions";
import path from "node:path";
import fs from "node:fs";
import { filesDir } from "../utils/Utils.js";
import isLocalhost from "is-localhost-ip";
import Module from "node:module";
import { Logger } from "@tsed/logger";

const require = Module.createRequire(import.meta.url);

// punycode is weird. no ESM support
const punycode = require("punycode/");

@Service()
export class FileUrlService {
    @Constant(GlobalEnv.FILE_SIZE_UPLOAD_LIMIT_MB)
    private readonly MAX_SIZE: string;

    @Constant(GlobalEnv.MAX_URL_LENGTH)
    private readonly MAX_URL_LENGTH: string;

    public constructor(@Inject() private logger: Logger) {}

    public async getFile(url: string): Promise<[string, string]> {
        let maxUrlLength = Number.parseInt(this.MAX_URL_LENGTH);
        if (Number.isNaN(maxUrlLength)) {
            maxUrlLength = -1;
        }

        if (maxUrlLength <= 0) {
            throw new Forbidden("Feature unavailable"); // URL feature disabled
        } else if (url.length > maxUrlLength) {
            throw new RequestURITooLong(`URL supplied is too long. the max is ${maxUrlLength}`);
        }

        const isLocalUrl = await this.isLocalhost(url);
        if (isLocalUrl) {
            throw new BadRequest("Unable to accept URL");
        }

        let headCheck: Response;
        try {
            headCheck = await fetch(url, {
                method: "HEAD",
            });
        } catch (e) {
            throw new BadRequest(e.message);
        }
        const contentLengthStr = headCheck.headers.get("content-length");
        if (!contentLengthStr) {
            const resp = await headCheck.text();
            throw new HTTPException(headCheck.status, resp);
        }
        const contentLength = Number.parseInt(contentLengthStr);
        if (contentLength > Number.parseInt(this.MAX_SIZE) * 1048576) {
            throw new BadRequest("file too big");
        }

        let response: Response;
        try {
            response = await fetch(url, {
                method: "GET",
            });
        } catch (e) {
            throw new BadRequest(e.message);
        }
        if (!response || !response.ok) {
            const resp = await response.text();
            this.logger.error(`Error making request to ${url}. response is "${response.status}" with body: ${resp}`);
            // forward the error to the client
            throw new HTTPException(response.status, resp);
        }
        const now = Date.now();
        const originalFileName = url.substring(url.lastIndexOf("/") + 1);
        const ext = originalFileName.split(".").pop();
        const destination = path.resolve(`${filesDir}/${now}.${ext}`);
        const fileStream = fs.createWriteStream(destination);
        return new Promise((resolve, reject) => {
            if (!response.body) {
                reject("Response has no body");
                return;
            }
            response.body.pipe(fileStream);
            response.body.on("error", reject);
            fileStream.on("finish", resolve);
        }).then(() => [destination, originalFileName]);
    }

    private isLocalhost(url: string): Promise<boolean> {
        return isLocalhost(punycode.toASCII(url).split("/")[0].split(":")[0]);
    }
}
