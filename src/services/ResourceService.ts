import { Inject, Service } from "@tsed/di";
import { SettingsService } from "./SettingsService.js";
import { Restriction } from "../model/rest/Restriction.js";
import RestrictionType from "../model/constants/RestrictionType.js";
import { ObjectUtils } from "../utils/Utils.js";
import { Builder } from "builder-pattern";
import type { RestrictionValueType } from "../utils/typeings.js";
import { RecordInfoPayload } from "../model/rest/RecordInfoPayload.js";
import { FileRepo } from "../db/repo/FileRepo.js";
import { BadRequest } from "@tsed/exceptions";
import { GlobalEnv } from "../model/constants/GlobalEnv.js";

@Service()
export class ResourceService {
    private readonly socketStatus: string;

    public constructor(
        @Inject() private settingsService: SettingsService,
        @Inject() private repo: FileRepo,
    ) {
        this.socketStatus = settingsService.getSetting(GlobalEnv.HOME_PAGE_FILE_COUNTER);
    }

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
                case RestrictionType.ZIP_MAX_SIZE_MB: {
                    const settingValue = this.settingsService.getSetting(GlobalEnv.ZIP_MAX_SIZE_MB);
                    if (settingValue) {
                        const parsedValue = Number.parseInt(settingValue);
                        if (parsedValue > 0) {
                            retArr.push(this.getRestriction(restrictionType, parsedValue));
                        }
                    }
                    break;
                }
                case RestrictionType.MAX_ALBUM_SIZE: {
                    const settingValue = this.settingsService.getSetting(GlobalEnv.ALBUM_FILE_LIMIT);
                    if (settingValue) {
                        const parsedValue = Number.parseInt(settingValue);
                        if (parsedValue > 0) {
                            retArr.push(this.getRestriction(restrictionType, parsedValue));
                        }
                    }
                    break;
                }
            }
        }
        return retArr;
    }

    public getfileStats(): Promise<RecordInfoPayload> {
        if (this.socketStatus === "disabled") {
            throw new BadRequest("stats is disabled");
        }
        return RecordInfoPayload.fromRepo(this.repo);
    }

    private getRestriction(type: RestrictionType, value: RestrictionValueType): Restriction {
        const restrictionBuilder = Builder(Restriction);
        restrictionBuilder.type(type);
        restrictionBuilder.value(value);
        return restrictionBuilder.build();
    }
}
