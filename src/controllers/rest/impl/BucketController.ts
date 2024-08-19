import { Constant, Controller, Inject } from "@tsed/di";
import { Delete, Description, Get, Name, Post, Returns, Summary } from "@tsed/schema";
import { StatusCodes } from "http-status-codes";
import { DefaultRenderException } from "../../../model/rest/DefaultRenderException.js";
import { BaseRestController } from "../BaseRestController.js";
import { BucketService } from "../../../services/BucketService.js";
import { BucketDto } from "../../../model/dto/BucketDto.js";
import { PathParams } from "@tsed/common";
import { BadRequest } from "@tsed/exceptions";
import GlobalEnv from "../../../model/constants/GlobalEnv.js";
import { BodyParams } from "@tsed/platform-params";

@Controller("/bucket")
@Description("API for creating and deleting buckets.")
@Name("Bucket Management")
@(Returns(StatusCodes.FORBIDDEN, DefaultRenderException).Description("If your IP has been blocked"))
export class BucketController extends BaseRestController {
    public constructor(@Inject() private bucketService: BucketService) {
        super();
    }

    @Constant(GlobalEnv.BASE_URL)
    private readonly baseUrl: string;

    @Get("/createBucket")
    @Returns(StatusCodes.OK, BucketDto)
    @Returns(StatusCodes.BAD_REQUEST, DefaultRenderException)
    @Description("Create a new bucket")
    @Summary("Create a new bucket")
    public createBucket(): Promise<unknown> {
        return this.bucketService.createBucket();
    }

    @Delete("/:token")
    @Returns(StatusCodes.OK, Boolean)
    @Returns(StatusCodes.BAD_REQUEST, DefaultRenderException)
    @Description("Delete a bucket and all associated data")
    @Summary("Delete a bucket")
    public async deleteBucket(@PathParams("token") token: string): Promise<unknown> {
        if (!(await this.bucketService.deleteBucket(token))) {
            throw new BadRequest(`Unable to delete bucket with token ${token}`);
        }
        return true;
    }

    @Post()
    @Returns(StatusCodes.OK, BucketDto)
    @Returns(StatusCodes.BAD_REQUEST, DefaultRenderException)
    @Description("Get a bucket and all associated files")
    @Summary("Get a bucket")
    public async getBucket(@BodyParams("bucket_token") bucketToken: string): Promise<unknown> {
        const bucket = await this.bucketService.getBucket(bucketToken);
        if (!bucket) {
            throw new BadRequest(`Unable to find bucket with token ${bucketToken}`);
        }
        return BucketDto.fromModel(bucket, this.baseUrl);
    }
}
