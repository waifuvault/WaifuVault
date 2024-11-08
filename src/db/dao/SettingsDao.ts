import { Configuration, Injectable } from "@tsed/di";
import GlobalEnv from "../../model/constants/GlobalEnv.js";

@Injectable()
export class SettingsDao {
    public constructor(@Configuration() private configuration: Configuration) {}

    public getSetting(setting: GlobalEnv): string | null {
        return this.configuration.get<string | null>(setting, null);
    }
}
