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
        if (!input) {
            return false;
        }
        return (
            "draw" in input &&
            "recordsTotal" in input &&
            "recordsFiltered" in input &&
            "data" in input &&
            Object.getOwnPropertyNames(input).length === 4
        );
    }

    public transform(model: AdminDataTaleEntryModel): Promise<AdminData> {
        return AdminData.fromModel(model);
    }
}
