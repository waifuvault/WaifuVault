import { Controller, Inject } from "@tsed/di";
import { Delete, Description, Get, Name, Post, Returns, Summary } from "@tsed/schema";
import { StatusCodes } from "http-status-codes";
import { DefaultRenderException } from "../../../model/rest/DefaultRenderException.js";
import { BaseRestController } from "../BaseRestController.js";
import { BucketService } from "../../../services/BucketService.js";
import { BucketDto } from "../../../model/dto/BucketDto.js";
import { PathParams } from "@tsed/common";
import { BadRequest } from "@tsed/exceptions";
import { BodyParams } from "@tsed/platform-params";
import { BucketModel } from "../../../model/db/Bucket.model.js";

@Controller("/bucket")
@Description("API for creating and deleting buckets.")
@Name("Bucket Management")
@(Returns(StatusCodes.FORBIDDEN, DefaultRenderException).Description("If your IP has been blocked"))
export class BucketController extends BaseRestController {
    public constructor(@Inject() private bucketService: BucketService) {
        super();
    }

    @Get("/create")
    @Returns(StatusCodes.OK, BucketDto)
    @Returns(StatusCodes.BAD_REQUEST, DefaultRenderException)
    @Description("Create a new bucket")
    @Summary("Create a new bucket")
    public createBucket(): Promise<BucketModel> {
        return this.bucketService.createBucket();
    }

    @Delete("/:token")
    @Returns(StatusCodes.OK, Boolean)
    @Returns(StatusCodes.BAD_REQUEST, DefaultRenderException)
    @Description("Delete a bucket and all associated data")
    @Summary("Delete a bucket")
    public async deleteBucket(@PathParams("token") token: string): Promise<boolean> {
        if (!(await this.bucketService.deleteBucket(token))) {
            throw new BadRequest(`Unable to delete bucket with token ${token}`);
        }
        return true;
    }

    @Post("/get")
    @Returns(StatusCodes.OK, BucketDto)
    @Returns(StatusCodes.BAD_REQUEST, DefaultRenderException)
    @Description("Get a bucket and all associated files")
    @Summary("Get a bucket")
    public async getBucket(@BodyParams("bucket_token") bucketToken: string): Promise<BucketModel> {
        const bucket = await this.bucketService.getBucket(bucketToken, true, true);
        if (!bucket) {
            throw new BadRequest(`Unable to find bucket with token ${bucketToken}`);
        }
        return bucket;
    }
}
