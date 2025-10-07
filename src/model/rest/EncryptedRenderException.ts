import { Description, Name, Property } from "@tsed/schema";
import { DefaultRenderException } from "./DefaultRenderException.js";

@Name("WaifuEncrypted")
@Description("Info for protected file")
export class EncryptedRenderException extends DefaultRenderException {
    @Property()
    @Description("if the file is encrypted or just password protected")
    public encrypted: boolean;

    public constructor(name: string, message: string, status: number, encrypted: boolean) {
        super(name, message, status);
        this.name = name;
        this.message = message;
        this.status = status;
        this.encrypted = encrypted;
    }
}
