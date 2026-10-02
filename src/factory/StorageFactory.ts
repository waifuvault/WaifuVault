import { Inject, Injectable } from "@tsed/di";
import type { IStorageEngine } from "../engine/IStorageEngine.js";
import { STORAGE_ENGINE } from "../model/di/tokens.js";
import type { StorageBackend } from "../utils/typeings.js";

@Injectable()
export class StorageFactory {
    public constructor(@Inject(STORAGE_ENGINE) private readonly engines: IStorageEngine[]) {}

    public getEnabledEngines(): IStorageEngine[] {
        return this.engines.filter(engine => engine.enabled);
    }

    public getEngine(backend: StorageBackend): IStorageEngine | null {
        return this.engines.find(engine => engine.enabled && engine.id === backend) ?? null;
    }
}
