import {Nsp, SocketService} from "@tsed/socketio";
import * as SocketIO from "socket.io";

@SocketService("/entry")
export class EntrySocketService {

    @Nsp
    private nsp: SocketIO.Namespace;

    public emitEntry(): boolean {
        return this.nsp.emit("entry");
    }
}
