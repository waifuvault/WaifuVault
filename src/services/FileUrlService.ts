import { Constant, Inject, Service } from "@tsed/di";
import GlobalEnv from "../model/constants/GlobalEnv.js";
import { BadRequest, Forbidden, HTTPException, RequestURITooLong } from "@tsed/exceptions";
import path from "node:path";
import fs from "node:fs";
import { filesDir } from "../utils/Utils.js";
import Module from "node:module";
import { Logger } from "@tsed/logger";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import { ReadableStream } from "node:stream/web";
import isLocalhost from "is-localhost-ip";

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

    public async getFile(url: string, testing = false): Promise<[string, string]> {
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
            throw new HTTPException(headCheck.status, "Unable to determine file size of URL");
        }
        const maxSizeBits = Number.parseInt(this.MAX_SIZE) * 1048576;
        const contentLength = Number.parseInt(contentLengthStr);
        if (contentLength > maxSizeBits) {
            throw new BadRequest("file too big");
        }

        const response = await this.fetchResource(url, maxSizeBits);
        const now = Date.now();
        const originalFileName = url.substring(url.lastIndexOf("/") + 1);
        const ext = originalFileName.split(".").pop();
        const destination = path.resolve(`${filesDir}/${now}.${ext}`);
        const fileStream = fs.createWriteStream(destination);
        if (testing) {
            Readable.fromWeb(response);
        } else {
            await finished(Readable.fromWeb(response).pipe(fileStream));
        }
        return [destination, originalFileName];
    }

    private async fetchResource(url: string, fileSizeLimit: number): Promise<ReadableStream> {
        const controller = new AbortController();
        const signal = controller.signal;
        let response: Response;
        try {
            response = await fetch(url, {
                method: "GET",
                signal,
            });
        } catch (e) {
            throw new BadRequest(e.message);
        }
        if (!response.ok) {
            const resp = await response.text();
            this.logger.error(`Error making request to ${url}. response is "${response.status}" with body: ${resp}`);
            // forward the error to the client
            throw new HTTPException(response.status, resp);
        }
        if (!response.body) {
            throw new BadRequest("URL supplied has no body");
        }

        const reader = response.body.getReader();

        let receivedLength = 0;
        const chunks: Uint8Array[] = [];
        for (;;) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            receivedLength += value.length;
            if (receivedLength > fileSizeLimit) {
                controller.abort("File limit reached");
                throw new BadRequest("File size limit reached while download resource");
            }
            chunks.push(value);
        }
        return ReadableStream.from(chunks);
    }

    private isLocalhost(url: string): Promise<boolean> {
        return url.includes("://")
            ? isLocalhost(punycode.toASCII(url).split("://")[1].split("/")[0])
            : isLocalhost(punycode.toASCII(url).split("/")[0]);
    }
}
