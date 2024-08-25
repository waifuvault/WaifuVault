import { Inject, Injectable } from "@tsed/di";
import GlobalEnv from "../../model/constants/GlobalEnv.js";
import { SettingsDao } from "../dao/SettingsDao.js";

@Injectable()
export class SettingsRepo {
    public constructor(@Inject() private settingsDao: SettingsDao) {}

    public getSetting(setting: GlobalEnv): string | null {
        return this.settingsDao.getSetting(setting);
    }
}
