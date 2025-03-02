import { Inject, Injectable } from "@tsed/di";
import { SettingsDao } from "../dao/SettingsDao.js";
import type { GlobalEnv, GuaranteedString } from "../../model/constants/GlobalEnv.js";

@Injectable()
export class SettingsRepo {
    public constructor(@Inject() private settingsDao: SettingsDao) {}

    public getSetting<K extends GlobalEnv>(setting: K): K extends GuaranteedString ? string : string | null {
        return this.settingsDao.getSetting(setting);
    }
}
