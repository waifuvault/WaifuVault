import { IAvEngine } from "../../IAvEngine.js";
import { Constant, Injectable, ProviderScope } from "@tsed/di";
import GlobalEnv from "../../../model/constants/GlobalEnv.js";
import { AvScanResult } from "../../../utils/typeings.js";
import path from "node:path";
import { filesDir } from "../../../utils/Utils.js";
import { promisify } from "node:util";
import { exec } from "node:child_process";
import { AV_ENGINE } from "../../../model/di/tokens.js";

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: AV_ENGINE,
})
export class MsDefenderEngine implements IAvEngine {
    @Constant(GlobalEnv.MS_DEFENDER_PATH)
    private msDefenderPath: string | undefined;

    public get enabled(): boolean {
        return !!this.msDefenderPath;
    }

    public async scan(resource: string): Promise<AvScanResult> {
        const toScan = path.resolve(`${filesDir}/${resource}`);
        const execPromise = promisify(exec);
        try {
            await execPromise(`"${this.msDefenderPath}/MpCmdRun.exe" -scan -scantype 3 -file ${toScan} -DisableRemediation`);
        } catch (e) {
            return {
                errorCode: e.code,
                passed: false,
                additionalMessage: e.messag,
            };
        }
        return {
            passed: true,
        };
    }
}
