import { Inject, Injectable } from "@tsed/di";
import { AV_ENGINE } from "../model/di/tokens.js";
import type { IAvEngine } from "../engine/IAvEngine.js";

@Injectable()
export class AvFactory {
    public constructor(@Inject(AV_ENGINE) private readonly engines: IAvEngine[]) {}

    /**
     * Get all enabled av engines
     * @returns {IAvEngine[]}
     */
    public async getAvEngines(): Promise<IAvEngine[]> {
        const enabledEngines = await Promise.all(
            this.engines.map(async engine => ((await engine.enabled) ? engine : null)),
        );

        return enabledEngines.filter(engine => engine !== null) as IAvEngine[];
    }
}
