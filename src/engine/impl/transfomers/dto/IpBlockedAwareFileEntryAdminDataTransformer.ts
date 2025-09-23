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
export class IpBlockedAwareFileEntryAdminDataTransformer
    implements ITransformer<AdminDataTaleEntryModel | IpBlockedAwareFileEntry, AdminData>
{
    @InjectContext()
    private $ctx?: PlatformContext;

    public supportsInput(input: object): boolean {
        if (!input) {
            return false;
        }
        const keys = Object.keys(input);
        if (this.$ctx && this.$ctx.request.url.startsWith("/rest/admin") && keys.includes("ipBlocked")) {
            return true;
        }
        return (
            keys.length === 4 &&
            keys[0] === "draw" &&
            keys[1] === "recordsTotal" &&
            keys[2] === "recordsFiltered" &&
            keys[3] === "data"
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
