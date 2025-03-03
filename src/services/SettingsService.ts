import { Inject, Service } from "@tsed/di";
import { SettingsRepo } from "../db/repo/SettingsRepo.js";
import type { GlobalEnv, GuaranteedString } from "../model/constants/GlobalEnv.js";

@Service()
export class SettingsService {
    public constructor(@Inject() private settingsRepo: SettingsRepo) {}

    public getSetting<K extends GlobalEnv>(setting: K): K extends GuaranteedString ? string : string | null {
        return this.settingsRepo.getSetting(setting);
    }

    public getAllSettings(): Record<GlobalEnv, string | null> {
        return this.settingsRepo.getAllSettings();
    }
}
