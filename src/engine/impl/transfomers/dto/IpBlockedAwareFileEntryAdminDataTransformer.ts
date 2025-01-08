import { AdminDataTaleEntryModel } from "../../../../utils/typeings.js";
import { AdminData } from "../../../../model/dto/AdminData.js";
import { Injectable, ProviderScope } from "@tsed/di";
import { TRANSFORMER } from "../../../../model/di/tokens.js";
import { ITransformer } from "../../../ITransformer.js";

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: TRANSFORMER,
})
export class IpBlockedAwareFileEntryAdminDataTransformer implements ITransformer<AdminDataTaleEntryModel, AdminData> {
    public supportsInput(input: object): boolean {
        const keys = Object.keys(input);
        return (
            keys.length === 4 &&
            keys[0] === "draw" &&
            keys[1] === "recordsTotal" &&
            keys[2] === "recordsFiltered" &&
            keys[3] === "data"
        );
    }

    public transform(model: AdminDataTaleEntryModel): Promise<AdminData> {
        return AdminData.fromModel(model);
    }
}
