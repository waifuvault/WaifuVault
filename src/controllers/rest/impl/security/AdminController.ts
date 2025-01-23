import { AbstractAdminController } from "./AbstractAdminController.js";
import { Controller, Inject } from "@tsed/di";
import { UserAdminService } from "../../../../services/UserAdminService.js";
import { Delete, Get, Hidden, Post, Required } from "@tsed/schema";
import { PlatformResponse, QueryParams, Res } from "@tsed/common";
import type {
    AdminDataTaleEntryModel,
    DatatableColumn,
    DatatableOrder,
    DatatableSearch,
    IpBlockedAwareFileEntry,
} from "../../../../utils/typeings.js";
import { BodyParams } from "@tsed/platform-params";
import { StatusCodes } from "http-status-codes";
import { Authorize } from "@tsed/passport";
import { IAdminController } from "../../IAdminController.js";
import { IpBlackListRepo } from "../../../../db/repo/IpBlackListRepo.js";
import { IpBlackListModel } from "../../../../model/db/IpBlackList.model.js";

@Hidden()
@Authorize("loginAuthProvider")
@Controller("/admin")
export class AdminController extends AbstractAdminController implements IAdminController {
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
        let sortColumn;
        let sortOrder;
        const searchVal = search ? search.value : undefined;
        if (order && columns) {
            sortOrder = order[0]?.dir.toUpperCase();
            sortColumn = columns[order[0]?.column ?? 0]?.data;
        }
        const files = await this.adminService.getPagedEntries(start, length, sortColumn, sortOrder, searchVal);
        const data = await this.mapIpToFileEntries(files);
        const records = searchVal
            ? await this.adminService.getFileSearchRecordCount(search.value)
            : await this.adminService.getFileRecordCount();

        return {
            draw: draw,
            recordsTotal: records,
            recordsFiltered: records,
            data: data,
        };
    }

    @Get("/blockedIps")
    public getAllBlockedIps(): Promise<IpBlackListModel[]> {
        return this.userAdminService.getAllBlockedIps();
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

    @Get("/allEntries")
    public override getAllEntries(): Promise<IpBlockedAwareFileEntry[]> {
        return super.getAllEntries();
    }

    @Delete("/deleteEntries")
    public override deleteEntries(
        @Res() res: PlatformResponse,
        @BodyParams() ids: number[],
    ): Promise<PlatformResponse> {
        return super.deleteEntries(res, ids);
    }

    @Get("/statsData")
    public override getStatsData(): Promise<IpBlockedAwareFileEntry[]> {
        return super.getStatsData();
    }
}
