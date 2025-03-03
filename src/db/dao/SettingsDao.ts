import { Configuration, Injectable } from "@tsed/di";
import { defaultValues, GlobalEnv, GuaranteedString, prefix } from "../../model/constants/GlobalEnv.js";

@Injectable()
export class SettingsDao {
    public constructor(@Configuration() private configuration: Configuration) {}

    public getSetting<K extends GlobalEnv>(setting: K): K extends GuaranteedString ? string : string | null {
        type ReturnType = K extends GuaranteedString ? string : string | null;
        return this.configuration.get<string | null>(setting, defaultValues[setting]) as ReturnType;
    }

    public getAllSettings(): Record<GlobalEnv, string | null> {
        const returnVal: Partial<Record<GlobalEnv, string | null>> = {};
        const allEnvs = Object.keys(GlobalEnv);
        for (const ev of allEnvs) {
            returnVal[ev as GlobalEnv] = this.getSetting(`${prefix}${ev}` as GlobalEnv);
        }
        return returnVal as Record<GlobalEnv, string | null>;
    }
}
