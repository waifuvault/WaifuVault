import { Configuration, Injectable } from "@tsed/di";
import type { GlobalEnv, GuaranteedString } from "../../model/constants/GlobalEnv.js";
import { defaultValues } from "../../model/constants/GlobalEnv.js";

@Injectable()
export class SettingsDao {
    public constructor(@Configuration() private configuration: Configuration) {}

    public getSetting<K extends GlobalEnv>(setting: K): K extends GuaranteedString ? string : string | null {
        type ReturnType = K extends GuaranteedString ? string : string | null;
        return this.configuration.get<string | null>(setting, defaultValues[setting]) as ReturnType;
    }
}
