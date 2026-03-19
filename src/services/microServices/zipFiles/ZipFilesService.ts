import { Constant, InjectContext, Service } from "@tsed/di";
import { FileUploadModel } from "../../../model/db/FileUpload.model.js";
import { MicroServiceResponse } from "../../../utils/typeings.js";
import { HTTPException } from "@tsed/exceptions";
import { filesDir, NetworkUtils } from "../../../utils/Utils.js";
import type { PlatformContext } from "@tsed/platform-http";
import { GlobalEnv } from "../../../model/constants/GlobalEnv.js";

@Service()
export class ZipFilesService {
    @InjectContext()
    protected $ctx?: PlatformContext;

    @Constant(GlobalEnv.ZIP_SERVICE_BASE_URL, "http://127.0.0.1:5005")
    private readonly baseUrl: string;

    private get url(): string {
        return `${this.baseUrl}/api/v1`;
    }

    public async zipFiles(files: FileUploadModel[], albumName: string): Promise<string> {
        const servicePayload = files.map(file => {
            return {
                fileOnDisk: file.fullFileNameOnSystem,
                parsedFilename: file.parsedFileName,
            };
        });

        const req = this.$ctx?.request.request;
        if (!req) {
            throw new HTTPException(500, "Unable to find IP");
        }

        const ip = NetworkUtils.getIp(req);

        const res = await fetch(`${this.url}/zipFiles?albumName=${albumName}&ip=${ip}`, {
            method: "POST",
            body: JSON.stringify(servicePayload),
            headers: {
                "Content-Type": "application/json",
            },
        });

        const responseBody: MicroServiceResponse = await res.json();
        if (res.ok) {
            return `${filesDir}/${responseBody.message}`;
        }
        // convert it to a waifu exception with the proxied error
        throw new HTTPException(res.status, responseBody.message);
    }
}
