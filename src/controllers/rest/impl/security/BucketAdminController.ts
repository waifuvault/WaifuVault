import { AbstractAdminController } from "./AbstractAdminController.js";
import { Controller, Inject } from "@tsed/di";
import { Delete, Get, Hidden, CollectionOf } from "@tsed/schema";
import { PlatformResponse, Res } from "@tsed/platform-http";
import { BodyParams, PathParams, QueryParams } from "@tsed/platform-params";
import { UseBefore } from "@tsed/platform-middlewares";
import type {
    DatatableColumn,
    DatatableOrder,
    DatatableSearch,
    IpBlockedAwareFileEntry,
} from "../../../../utils/typeings.js";
import { AuthoriseBucket } from "../../../../middleware/endpoint/AuthoriseBucket.js";
import { IAdminController } from "../../IAdminController.js";
import { BucketAdminService } from "../../../../services/BucketAdminService.js";
import { BucketService } from "../../../../services/BucketService.js";
import { IpBlackListRepo } from "../../../../db/repo/IpBlackListRepo.js";
import { StatsModel } from "../../../../model/dto/StatsDto.js";
import { AdminBucketDto } from "../../../../model/dto/AdminBucketDto.js";
import BucketType from "../../../../model/constants/BucketType";
import { NotFound } from "@tsed/exceptions";

@Hidden()
@Controller("/admin/bucket")
@UseBefore(AuthoriseBucket)
export class BucketAdminController extends AbstractAdminController implements IAdminController {
    public constructor(
        @Inject() private bucketAdminService: BucketAdminService,
        @Inject() private bucketService: BucketService,
        @Inject() blackListRepo: IpBlackListRepo,
    ) {
        super(bucketAdminService, blackListRepo);
    }

    @Get("/datatablesEntries")
    public override async getDatatablesEntries(
        @QueryParams("draw") draw: number,
        @QueryParams("start") start: number,
        @QueryParams("length") length: number,
        @QueryParams("order") order: DatatableOrder[],
        @QueryParams("columns") columns: DatatableColumn[],
        @QueryParams("search") search: DatatableSearch,
    ): Promise<unknown> {
        let sortColumn;
        let sortOrder;
        const searchVal = search ? search.value : undefined;
        if (order && columns) {
            sortOrder = order[0]?.dir.toUpperCase();
            sortColumn = columns[order[0]?.column ?? 0]?.data;
        }
        const bucketToken = this.bucketService.getLoggedInBucketToken()!;
        const files = await this.bucketAdminService.getPagedEntries(
            start,
            length,
            sortColumn,
            sortOrder,
            bucketToken,
            searchVal,
        );
        const data = await this.mapIpToFileEntries(files);
        const records = searchVal
            ? await this.bucketAdminService.getFileSearchRecordCount(search.value, bucketToken)
            : await this.bucketAdminService.getFileRecordCount(bucketToken);
        return {
            draw: draw,
            recordsTotal: records,
            recordsFiltered: records,
            data: data,
        };
    }

    @Get("/allEntries")
    public override getAllEntries(): Promise<IpBlockedAwareFileEntry[]> {
        return super.getAllEntries();
    }

    @Get("/")
    public getAdminBucket(): Promise<AdminBucketDto | null> {
        return this.bucketService.getBucket() as Promise<AdminBucketDto | null>;
    }

    @Delete("/deleteEntries")
    public override deleteEntries(
        @Res() res: PlatformResponse,
        @BodyParams() @CollectionOf(Number) ids: number[],
    ): Promise<PlatformResponse> {
        return super.deleteEntries(res, ids);
    }

    @Get("/statsData")
    public override getStatsData(): Promise<StatsModel> {
        return super.getStatsData();
    }

    @Get("/getBucketType/:token")
    public async getBucketType(@PathParams("token") token: string): Promise<BucketType> {
        const bucketType = await this.bucketAdminService.getBucketType(token);
        if (!bucketType) {
            throw new NotFound("Bucket not found");
        }
        return bucketType;
    }
}
