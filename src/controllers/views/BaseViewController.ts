import { SettingsService } from "../../services/SettingsService.js";

export abstract class BaseViewController {
    protected constructor(protected settingsService: SettingsService) {}

    protected mergeWithEnvs<T = Record<string, unknown>>(mvcDto?: Record<string, unknown>): T {
        const allEnvs = this.settingsService.getAllSettings();
        if (!mvcDto) {
            return allEnvs as T;
        }
        return { ...mvcDto, ...allEnvs } as T;
    }
}
