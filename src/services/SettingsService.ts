import { Inject, Service } from "@tsed/di";
import { SettingsRepo } from "../db/repo/SettingsRepo.js";
import GlobalEnv from "../model/constants/GlobalEnv.js";

@Service()
export class SettingsService {
    public constructor(@Inject() private settingsRepo: SettingsRepo) {}

    public getSetting(setting: GlobalEnv): string | null {
        return this.settingsRepo.getSetting(setting);
    }
}
