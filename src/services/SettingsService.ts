import { Inject, Service } from "@tsed/di";
import { SettingsRepo } from "../db/repo/SettingsRepo.js";
import { GlobalEnv, GuaranteedString } from "../model/constants/GlobalEnv.js";

@Service()
export class SettingsService {
    public constructor(@Inject() private settingsRepo: SettingsRepo) {}

    public getSetting<K extends GlobalEnv>(setting: K): K extends GuaranteedString ? string : string | null {
        return this.settingsRepo.getSetting(setting);
    }

    public getAllSettings(): Record<GlobalEnv, string | null> {
        return this.settingsRepo.getAllSettings();
    }

    public getMaxFileSize(): number {
        return Number.parseInt(this.getSetting(GlobalEnv.FILE_SIZE_UPLOAD_LIMIT_MB)) * 1048576;
    }
}
