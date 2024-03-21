import { Description, Name, Property } from "@tsed/schema";

@Name("WaifuError")
@Description("A standard error, all errors from the service will take this shape")
export class DefaultRenderException {
    @Property()
    @Description("The name of the error, this is normally the HTTP exception thrown")
    public name: string;

    @Property()
    @Description("The thing that went wrong")
    public message: string;

    @Property()
    @Description("the HTTP status")
    public status: number;

    public constructor(name: string, message: string, status: number) {
        this.name = name;
        this.message = message;
        this.status = status;
    }
}
