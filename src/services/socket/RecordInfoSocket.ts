import { Nsp, SocketService } from "@tsed/socketio";
import * as SocketIO from "socket.io";
import { Inject } from "@tsed/di";
import { FileRepo } from "../../db/repo/FileRepo.js";
import { RecordInfoPayload } from "../../model/rest/RecordInfoPayload.js";
import { SettingsService } from "../SettingsService.js";
import { GlobalEnv } from "../../model/constants/GlobalEnv.js";
import { Logger } from "@tsed/logger";

@SocketService("/recordInfo")
export class RecordInfoSocket {
    @Nsp
    private nsp: SocketIO.Namespace;

    private readonly socketStatus: string;

    public constructor(
        @Inject() private repo: FileRepo,
        @Inject() private logger: Logger,
        @Inject() settingsService: SettingsService,
    ) {
        this.socketStatus = settingsService.getSetting(GlobalEnv.HOME_PAGE_FILE_COUNTER);
    }

    public emit(): void {
        if (this.socketStatus !== "dynamic") {
            return;
        }

        this.broadcast().catch(err => this.logger.error(err));
    }

    private async broadcast(): Promise<void> {
        const payload = await RecordInfoPayload.fromRepo(this.repo);
        this.nsp.emit("record", payload);
    }

    public $onConnection(): void {
        this.emit();
    }
}
