import { AbstractAdminController } from "./AbstractAdminController.js";
import { Controller, Inject } from "@tsed/di";
import { Delete, Get, Hidden } from "@tsed/schema";
import { PlatformResponse, QueryParams, Res, UseBefore } from "@tsed/common";
import type {
    DatatableColumn,
    DatatableOrder,
    DatatableSearch,
    IpBlockedAwareFileEntry,
} from "../../../../utils/typeings.js";
import { AuthoriseBucket } from "../../../../middleware/endpoint/AuthoriseBucket.js";
import { BodyParams } from "@tsed/platform-params";
import { IAdminController } from "../../IAdminController.js";
import { BucketAdminService } from "../../../../services/BucketAdminService.js";
import { BucketService } from "../../../../services/BucketService.js";
import { IpBlackListRepo } from "../../../../db/repo/IpBlackListRepo.js";
import { BucketModel } from "../../../../model/db/Bucket.model.js";
import { StatsModel } from "../../../../model/dto/StatsDto.js";

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
        const bucketToken = (await this.bucketService.getLoggedInBucketToken())!;
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
    public getAdminBucket(): Promise<BucketModel | null> {
        return this.bucketService.getBucket();
    }

    @Delete("/deleteEntries")
    public override deleteEntries(
        @Res() res: PlatformResponse,
        @BodyParams() ids: number[],
    ): Promise<PlatformResponse> {
        return super.deleteEntries(res, ids);
    }

    @Get("/statsData")
    public override getStatsData(): Promise<StatsModel> {
        return super.getStatsData();
    }
}
