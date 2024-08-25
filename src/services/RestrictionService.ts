import { Inject, Service } from "@tsed/di";
import { SettingsService } from "./SettingsService.js";
import { Restriction } from "../model/rest/Restriction.js";
import RestrictionType from "../model/constants/RestrictionType.js";
import { ObjectUtils } from "../utils/Utils.js";
import { Builder } from "builder-pattern";
import GlobalEnv from "../model/constants/GlobalEnv.js";
import { RestrictionValueType } from "../utils/typeings.js";

@Service()
export class RestrictionService {
    public constructor(@Inject() private settingsService: SettingsService) {}

    public getAllRestrictions(): Restriction[] {
        const retArr: Restriction[] = [];
        for (const k of ObjectUtils.enumKeys(RestrictionType)) {
            const restrictionType = RestrictionType[k];
            switch (restrictionType) {
                case RestrictionType.BLOCKED_MIME_TYPES: {
                    const settingValue = this.settingsService.getSetting(GlobalEnv.BLOCKED_MIME_TYPES);
                    if (settingValue) {
                        retArr.push(this.getRestriction(restrictionType, settingValue));
                    }
                    break;
                }
                case RestrictionType.FILE_SIZE_UPLOAD_LIMIT_MB: {
                    const settingValue = this.settingsService.getSetting(GlobalEnv.FILE_SIZE_UPLOAD_LIMIT_MB);
                    if (settingValue) {
                        retArr.push(this.getRestriction(restrictionType, Number.parseInt(settingValue) * 1048576));
                    }
                    break;
                }
            }
        }
        return retArr;
    }

    private getRestriction(type: RestrictionType, value: RestrictionValueType): Restriction {
        const restrictionBuilder = Builder(Restriction);
        restrictionBuilder.type(type);
        restrictionBuilder.value(value);
        return restrictionBuilder.build();
    }
}
