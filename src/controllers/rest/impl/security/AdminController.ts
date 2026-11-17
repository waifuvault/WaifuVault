import { AbstractAdminController } from "./AbstractAdminController.js";
import { Controller, Inject } from "@tsed/di";
import { UserAdminService } from "../../../../services/UserAdminService.js";
import { Delete, Get, Hidden, Post, Required, CollectionOf } from "@tsed/schema";
import { PlatformResponse, Res } from "@tsed/platform-http";
import { BodyParams, QueryParams } from "@tsed/platform-params";
import type {
    AdminDataTaleEntryModel,
    BucketFileCount,
    DatatableColumn,
    DatatableOrder,
    DatatableSearch,
    FileSortColumn,
    SortDirection,
} from "../../../../utils/typeings.js";
import { StatusCodes } from "http-status-codes";
import { BadRequest } from "@tsed/exceptions";
import { Authorize } from "@tsed/passport";
import { IAdminController } from "../../IAdminController.js";
import { IpBlackListRepo } from "../../../../db/repo/IpBlackListRepo.js";
import { IpBlackListModel } from "../../../../model/db/IpBlackList.model.js";
import { StatsModel } from "../../../../model/dto/StatsDto.js";
import BucketType from "../../../../model/constants/BucketType.js";

@Hidden()
@Authorize("loginAuthProvider")
@Controller("/admin")
export class AdminController extends AbstractAdminController implements IAdminController {
    private readonly sortableColumns: FileSortColumn[] = [
        "id",
        "originalFileName",
        "createdAt",
        "fileSize",
        "fileExtension",
        "addedToAlbumOrder",
    ];

    private readonly sortDirections: SortDirection[] = ["ASC", "DESC"];

    public constructor(
        @Inject() private userAdminService: UserAdminService,
        @Inject() blackListRepo: IpBlackListRepo,
    ) {
        super(userAdminService, blackListRepo);
    }

    @Get("/datatablesEntries")
    public override async getDatatablesEntries(
        @QueryParams("draw") draw: number,
        @QueryParams("start") start: number,
        @QueryParams("length") length: number,
        @QueryParams("order") order: DatatableOrder[],
        @QueryParams("columns") columns: DatatableColumn[],
        @QueryParams("search") search: DatatableSearch,
    ): Promise<AdminDataTaleEntryModel> {
        const searchVal = search ? search.value : undefined;
        const requestedColumn = order && columns ? columns[order[0]?.column ?? 0]?.data : undefined;
        const requestedDirection = order && columns ? order[0]?.dir.toUpperCase() : undefined;
        const sortColumn = this.sortableColumns.find(column => column === requestedColumn);
        const sortDirection = this.sortDirections.find(direction => direction === requestedDirection);

        if (requestedColumn !== undefined && sortColumn === undefined) {
            throw new BadRequest(`Cannot sort by ${requestedColumn}`);
        }
        if (requestedDirection !== undefined && sortDirection === undefined) {
            throw new BadRequest(`Invalid sort direction ${requestedDirection}`);
        }

        const files = await this.userAdminService.getMatchingEntries(
            start,
            length,
            sortColumn,
            sortDirection,
            searchVal,
        );
        const data = await this.mapIpToFileEntries(files);
        const records = searchVal
            ? await this.userAdminService.getMatchingRecordCount(searchVal)
            : await this.adminService.getFileRecordCount();

        return {
            draw: draw,
            recordsTotal: records,
            recordsFiltered: records,
            data: data,
        };
    }

    @Post("/setBucketType")
    public async setBucketType(
        @Res() res: PlatformResponse,
        @Required() @BodyParams("token") token: string,
        @Required() @BodyParams("bucketType") bucketType: BucketType,
    ): Promise<PlatformResponse> {
        if (await this.userAdminService.setBucketType(token, bucketType)) {
            return super.doSuccess(res, "Bucket Type Set Succeeded");
        }
        return super.doError(res, "Bucket Type Set Failed", StatusCodes.INTERNAL_SERVER_ERROR);
    }

    @Get("/blockedIps")
    public getAllBlockedIps(): Promise<IpBlackListModel[]> {
        return this.userAdminService.getAllBlockedIps();
    }

    @Get("/bucketFileCounts")
    public getBucketFileCounts(): Promise<BucketFileCount[]> {
        return this.userAdminService.getBucketFileCounts();
    }

    @Post("/blockIp")
    public async blockIp(
        @Res() res: PlatformResponse,
        @QueryParams("removeRelatedData", Boolean) removeRelatedData = false,
        @Required() @BodyParams("ip") ip: string,
    ): Promise<PlatformResponse> {
        await this.userAdminService.blockIp(ip, removeRelatedData);
        return super.doSuccess(res, "IP blocked");
    }

    @Post("/unblockIps")
    public async unblockIps(@Res() res: PlatformResponse, @BodyParams() ips: string[]): Promise<unknown> {
        const success = await this.userAdminService.removeBlockedIps(ips);
        if (!success) {
            return super.doError(res, "Unable to remove selected ips", StatusCodes.INTERNAL_SERVER_ERROR);
        }
        return super.doSuccess(res, "IP un-blocked");
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
}
