import { AdminDataTaleEntryModel, type IpBlockedAwareFileEntry } from "../../../../utils/typeings.js";
import { AdminData } from "../../../../model/dto/AdminData.js";
import { Injectable, InjectContext, ProviderScope } from "@tsed/di";
import { TRANSFORMER } from "../../../../model/di/tokens.js";
import { ITransformer } from "../../../ITransformer.js";
import type { PlatformContext } from "@tsed/platform-http";

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: TRANSFORMER,
})
export class IpBlockedAwareFileEntryAdminDataTransformer implements ITransformer<
    AdminDataTaleEntryModel | IpBlockedAwareFileEntry,
    AdminData
> {
    @InjectContext()
    private $ctx?: PlatformContext;

    public supportsInput(input: unknown): boolean {
        if (!input || typeof input !== "object") {
            return false;
        }

        if (this.$ctx && this.$ctx.request.url.startsWith("/rest/admin") && "ipBlocked" in input) {
            return true;
        }

        return (
            "draw" in input &&
            "recordsTotal" in input &&
            "recordsFiltered" in input &&
            "data" in input &&
            Object.getOwnPropertyNames(input).length === 4
        );
    }

    public transform(model: AdminDataTaleEntryModel | IpBlockedAwareFileEntry): Promise<AdminData> {
        const keys = Object.keys(model);
        if (this.$ctx && this.$ctx.request.url.startsWith("/rest/admin") && keys.includes("ipBlocked")) {
            return AdminData.fromModel({
                draw: 0,
                recordsFiltered: 0,
                recordsTotal: 0,
                data: [model as IpBlockedAwareFileEntry],
            });
        }
        return AdminData.fromModel(model as AdminDataTaleEntryModel);
    }
}
