import { Nsp, SocketService } from "@tsed/socketio";
import * as SocketIO from "socket.io";
import { Constant, Inject } from "@tsed/di";
import { FileRepo } from "../../db/repo/FileRepo.js";
import { RecordInfoPayload } from "../../model/rest/RecordInfoPayload.js";
import GlobalEnv from "../../model/constants/GlobalEnv.js";

@SocketService("/recordInfo")
export class RecordInfoSocket {
    @Nsp
    private nsp: SocketIO.Namespace;

    @Constant(GlobalEnv.HOME_PAGE_FILE_COUNTER, "dynamic")
    private socketStatus: string;

    public constructor(@Inject() private repo: FileRepo) {}

    public async emit(): Promise<boolean> {
        if (this.socketStatus !== "dynamic") {
            return false;
        }
        const payload = await RecordInfoPayload.fromRepo(this.repo);
        return this.nsp.emit("record", payload);
    }

    public async $onConnection(): Promise<void> {
        await this.emit();
    }
}
