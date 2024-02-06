import {Constant, Service} from "@tsed/di";
import GlobalEnv from "../model/constants/GlobalEnv.js";
import fetch, {Response} from 'node-fetch';
import {BadRequest} from "@tsed/exceptions";
import path from "path";
import fs from "node:fs";
import {filesDir} from "../utils/Utils.js";
import isLocalhost from "is-localhost-ip";
import Module from "node:module";

const require = Module.createRequire(import.meta.url);

// punycode is weird. no ESM support
const punycode = require('punycode/');

@Service()
export class FileUrlService {

    @Constant(GlobalEnv.FILE_SIZE_UPLOAD_LIMIT_MB)
    private readonly MAX_SIZE: string;


    public async getFile(url: string): Promise<[string, string]> {

        const isLocalUrl = await this.isLocalhost(url);
        if (isLocalUrl) {
            throw new BadRequest("Unable to accept URL");
        }

        let headCheck: Response;
        try {
            headCheck = await fetch(url, {
                method: "HEAD"
            });
        } catch (e) {
            throw new BadRequest(e.message);
        }
        const contentLengthStr = headCheck.headers.get("content-length");
        if (!contentLengthStr) {
            throw new BadRequest("Unable to obtain content size for file");
        }
        const contentLength = Number.parseInt(contentLengthStr);
        if (contentLength > Number.parseInt(this.MAX_SIZE) * 1048576) {
            throw new BadRequest("file too big");
        }

        let response: Response;
        try {
            response = await fetch(url, {
                method: "GET"
            });
        } catch (e) {
            throw new BadRequest(e.message);
        }
        if (!response || !response.ok) {
            throw new BadRequest(`Unable to get response ${response.statusText}`);
        }
        const now = Date.now();
        const originalFileName = url.substring(url.lastIndexOf('/') + 1);
        const ext = originalFileName.split('.').pop();
        const destination = path.resolve(`${filesDir}/${now}.${ext}`);
        const fileStream = fs.createWriteStream(destination);
        return new Promise((resolve, reject) => {
            response.body!.pipe(fileStream);
            response.body!.on("error", reject);
            fileStream.on("finish", resolve);
        }).then(() => [destination, originalFileName]);
    }

    private isLocalhost(url: string): Promise<boolean> {
        return isLocalhost(punycode.toASCII(url).split('/')[0].split(':')[0]);
    }
}
