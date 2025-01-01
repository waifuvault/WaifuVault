import { Controller, Inject } from "@tsed/di";
import { Description, Get, Name, Returns, Summary } from "@tsed/schema";
import { StatusCodes } from "http-status-codes";
import { DefaultRenderException } from "../../../model/rest/DefaultRenderException.js";
import { BaseRestController } from "../BaseRestController.js";
import { Restriction } from "../../../model/rest/Restriction.js";
import { RestrictionService } from "../../../services/RestrictionService.js";

@Controller("/resources")
@Description("API for obtaining miscellaneous resources.")
@Name("Resource Management")
@(Returns(StatusCodes.FORBIDDEN, DefaultRenderException).Description("If your IP has been blocked"))
export class ResourceController extends BaseRestController {
    public constructor(@Inject() private restrictionService: RestrictionService) {
        super();
    }

    @Get("/restrictions")
    @(Returns(StatusCodes.OK, Array).Of(Restriction))
    @Returns(StatusCodes.BAD_REQUEST, DefaultRenderException)
    @Description("Get all the restrictions that each file will be subject to when being uploaded")
    @Summary("Get all restrictions")
    public getRestrictions(): Restriction[] {
        return this.restrictionService.getAllRestrictions();
    }
}
