import { Description, Name, Property } from "@tsed/schema";

@Name("WaifuHealth")
@Description("A health check response")
export class HealthCheckDto {
    @Name("success")
    @Description("Whether the health check was successful")
    @Property()
    public success: boolean;

    @Name("message")
    @Description("Health check response message")
    @Property()
    public message: string;

    @Name("latency")
    @Description("Ping latency in milliseconds")
    @Property()
    public latency: number;

    @Name("timestamp")
    @Description("ISO timestamp when the health check was performed")
    @Property()
    public timestamp: string;

    public constructor(success: boolean, message: string, latency: number) {
        this.success = success;
        this.message = message;
        this.latency = latency;
        this.timestamp = new Date().toISOString();
    }
}
