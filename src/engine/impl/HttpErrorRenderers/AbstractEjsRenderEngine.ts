import { SettingsService } from "../../../services/SettingsService.js";
import { PlatformResponse } from "@tsed/common";

export class AbstractEjsRenderEngine<T> {
    protected constructor(protected settingsService: SettingsService) {}

    protected renderWithEnvs(page: string, response: PlatformResponse, mvcDto?: Record<string, unknown>): Promise<T> {
        const allEnvs = this.settingsService.getAllSettings();
        if (!mvcDto) {
            return Promise.resolve(response.render(page, allEnvs) as T);
        }
        return Promise.resolve(response.render(page, { ...mvcDto, ...allEnvs }) as T);
    }
}
