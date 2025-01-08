import { Nsp, SocketService } from "@tsed/socketio";
import * as SocketIO from "socket.io";
import { Inject } from "@tsed/di";
import { FileRepo } from "../../db/repo/FileRepo.js";
import { RecordInfoPayload } from "../../model/rest/RecordInfoPayload.js";

@SocketService("/recordInfo")
export class RecordInfoSocket {
    public constructor(@Inject() private repo: FileRepo) {}

    @Nsp
    private nsp: SocketIO.Namespace;

    public async emit(): Promise<boolean> {
        const payload = await RecordInfoPayload.fromRepo(this.repo);
        return this.nsp.emit("record", payload);
    }

    public async $onConnection(): Promise<void> {
        await this.emit();
    }
}
