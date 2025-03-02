import { IAvEngine } from "../../IAvEngine.js";
import { Inject, Injectable, ProviderScope } from "@tsed/di";
import { AvScanResult } from "../../../utils/typeings.js";
import path from "node:path";
import { filesDir } from "../../../utils/Utils.js";
import { promisify } from "node:util";
import { exec } from "node:child_process";
import { AV_ENGINE } from "../../../model/di/tokens.js";
import { SettingsService } from "../../../services/SettingsService.js";
import { GlobalEnv } from "../../../model/constants/GlobalEnv.js";

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: AV_ENGINE,
})
export class MsDefenderEngine implements IAvEngine {
    private readonly msDefenderPath: string | null;

    public constructor(@Inject() settingsService: SettingsService) {
        this.msDefenderPath = settingsService.getSetting(GlobalEnv.MS_DEFENDER_PATH);
    }

    public get enabled(): boolean {
        return !!this.msDefenderPath;
    }

    public async scan(resource: string): Promise<AvScanResult> {
        const toScan = path.resolve(`${filesDir}/${resource}`);
        const execPromise = promisify(exec);
        try {
            await execPromise(
                `"${this.msDefenderPath}/MpCmdRun.exe" -scan -scantype 3 -file ${toScan} -DisableRemediation`,
            );
        } catch (e) {
            return {
                errorCode: e.code,
                passed: false,
                additionalMessage: e.message,
                engineName: this.name,
            };
        }
        return {
            passed: true,
            engineName: this.name,
        };
    }

    public get name(): string {
        return "MsDefender";
    }
}
