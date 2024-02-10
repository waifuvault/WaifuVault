import {Inject, Injectable} from "@tsed/di";
import {AV_ENGINE} from "../model/di/tokens.js";
import {IAvEngine} from "../engine/IAvEngine.js";

@Injectable()
export class AvFactory {
    public constructor(@Inject(AV_ENGINE) private readonly engines: IAvEngine[]) {
    }

    /**
     * Get the first enabled AV engine
     * @returns {IAvEngine | null}
     */
    public getFirstAvailableAvEngine(): IAvEngine | null {
        return this.engines.find(e => e.enabled) ?? null;
    }
}
