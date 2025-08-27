import { constant as getFromEnv, Inject, Service } from "@tsed/di";
import { SettingsService } from "./SettingsService.js";
import { OnReady } from "@tsed/platform-http";
import { FileUploadModel } from "../model/db/FileUpload.model.js";
import { FileService } from "./FileService.js";
import { RunEvery } from "../model/di/decorators/RunEvery.js";
import { GlobalEnv } from "../model/constants/GlobalEnv.js";
import { Logger } from "@tsed/logger";

@Service()
export class FileReputationService implements OnReady {
    private queue: FileUploadModel[];
    private readonly vtApiKey: string | null;
    private readonly vtReputationLimit: string | null;
    private readonly dangerousMimeTypes: string | null;

    public constructor(
        @Inject() private settingsService: SettingsService,
        @Inject() private fileService: FileService,
        @Inject() private logger: Logger,
    ) {
        this.queue = [];
        this.vtApiKey = settingsService.getSetting(GlobalEnv.VIRUSTOTAL_KEY);
        this.vtReputationLimit = settingsService.getSetting(GlobalEnv.VIRUSTOTAL_REPUTATION_LIMIT);
        this.dangerousMimeTypes = settingsService.getSetting(GlobalEnv.DANGEROUS_MIME_TYPES);
    }

    public async processFiles(): Promise<void> {
        await this.sleep(5000); // wait 5 seconds to avoid too early
        const batch = this.queue.splice(0, 4);
        const tokensToDelete: string[] = [];

        if (batch.length > 0 && this.vtApiKey && this.vtReputationLimit) {
            const reputationLimit = parseInt(this.vtReputationLimit, 10);
            const results = await Promise.all(
                batch.map(async file => {
                    const reputation = await this.fileReputation(file.checksum, this.vtApiKey ?? "");
                    return { file, reputation };
                }),
            );
            for (const r of results) {
                const { file, reputation } = r;
                if (reputation > reputationLimit) {
                    this.logger.error(
                        `File ${file.fullFileNameOnSystem} failed reputation check with score ${reputation} and was removed`,
                    );
                    tokensToDelete.push(file.token);
                }
            }
        }
        if (tokensToDelete.length > 0) {
            await this.fileService.processDelete(tokensToDelete);
        }
    }

    @RunEvery(() => getFromEnv(GlobalEnv.FILE_REPUTATION_CRON, "* * * * *"))
    public async $onReady(): Promise<void> {
        await this.processFiles();
    }

    public enqueueFile(file: FileUploadModel): void {
        this.queue.push(file);
    }

    private async fileReputation(filehash: string, apikey: string): Promise<number> {
        try {
            const headers: Record<string, string> = {};
            headers["x-apikey"] = apikey;
            headers["accept"] = "application/json";
            const response = await fetch(`https://www.virustotal.com/api/v3/files/${filehash}`, { headers: headers });
            if (response.ok) {
                const json = await response.json();
                if (json) {
                    if (json.data.attributes.total_votes) {
                        return Math.floor(
                            (json.data.attributes.total_votes.malicious /
                                (json.data.attributes.total_votes.malicious +
                                    json.data.attributes.total_votes.harmless)) *
                                10,
                        );
                    }
                }
            }
        } catch {
            return 0;
        }
        return 0;
    }

    private sleep(millis: number): Promise<unknown> {
        return new Promise(resolve => setTimeout(resolve, millis));
    }
}
