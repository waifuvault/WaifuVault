import { BaseRestController } from "../BaseRestController.js";
import { Controller } from "@tsed/di";
import { Description, Get, Name, Returns, Summary } from "@tsed/schema";
import { StatusCodes } from "http-status-codes";
import { DefaultRenderException } from "../../../model/rest/DefaultRenderException.js";
import { HealthCheckDto } from "../../../model/dto/HealthCheckDto.js";

@Controller("/health")
@Description("API for health checks")
@Name("Health Check")
@(Returns(StatusCodes.FORBIDDEN, DefaultRenderException).Description("If your IP has been blocked"))
export class HealthCheckController extends BaseRestController {
    @Get("/ping")
    @Returns(StatusCodes.OK, HealthCheckDto)
    @Description("Ping endpoint that returns latency information and health status")
    @Summary("Ping health check with latency")
    public ping(): HealthCheckDto {
        const startTime = process.hrtime.bigint();
        const endTime = process.hrtime.bigint();
        const latencyNs = endTime - startTime;
        const latencyMs = Number(latencyNs) / 1_000_000;

        return new HealthCheckDto(true, "pong", Math.round(latencyMs * 100) / 100);
    }
}
