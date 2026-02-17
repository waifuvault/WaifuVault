import { IAvEngine } from "../../IAvEngine.js";
import { AvScanResult } from "../../../utils/typeings.js";
import { Inject, Injectable, ProviderScope } from "@tsed/di";
import path from "node:path";
import { filesDir } from "../../../utils/Utils.js";
import { execFile as execFileCb } from "node:child_process";
import { AV_ENGINE } from "../../../model/di/tokens.js";
import { SettingsService } from "../../../services/SettingsService.js";
import { GlobalEnv } from "../../../model/constants/GlobalEnv.js";

const SCAN_TIMEOUT_MS = 60_000;

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: AV_ENGINE,
})
export class ClamAvEngine implements IAvEngine {
    private readonly clamPath: string | null;

    public constructor(@Inject() settingsService: SettingsService) {
        this.clamPath = settingsService.getSetting(GlobalEnv.CLAM_PATH);
    }

    public get enabled(): boolean {
        return !!this.clamPath;
    }

    public scan(resource: string): Promise<AvScanResult> {
        const toScan = path.join(filesDir, path.basename(resource));
        const executable = path.join(this.clamPath!, "clamdscan");

        return new Promise(resolve => {
            const child = execFileCb(executable, [toScan], { timeout: SCAN_TIMEOUT_MS }, (error, _, stderr) => {
                if (!error) {
                    resolve({ passed: true, engineName: this.name });
                    return;
                }

                if (error.killed) {
                    resolve({
                        errorCode: -1,
                        passed: true,
                        additionalMessage: "Scan timed out",
                        engineName: this.name,
                    });
                    return;
                }

                const exitCode = child.exitCode ?? 2;

                if (exitCode === 1) {
                    resolve({
                        errorCode: 1,
                        passed: false,
                        additionalMessage: stderr.trim() ?? "Malware detected",
                        engineName: this.name,
                    });
                    return;
                }

                resolve({
                    errorCode: exitCode,
                    passed: true,
                    additionalMessage: `Scan error (code ${exitCode}): ${stderr.trim() ?? error.message}`,
                    engineName: this.name,
                });
            });
        });
    }

    public get name(): string {
        return "ClamAv";
    }
}
