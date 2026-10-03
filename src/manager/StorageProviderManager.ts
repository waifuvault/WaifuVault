import { Inject, Injectable, OnInit } from "@tsed/di";
import { AfterInit } from "@tsed/platform-http";
import { Logger } from "@tsed/logger";
import { StorageFactory } from "../factory/StorageFactory.js";
import type { IStorageEngine } from "../engine/IStorageEngine.js";
import { SettingsService } from "../services/SettingsService.js";
import { GlobalEnv } from "../model/constants/GlobalEnv.js";
import type { StorageBackend } from "../utils/typeings.js";

@Injectable()
export class StorageProviderManager implements OnInit, AfterInit {
    private storageEngines: IStorageEngine[] = [];

    public constructor(
        @Inject() private storageFactory: StorageFactory,
        @Inject() private settingsService: SettingsService,
        @Inject() private logger: Logger,
    ) {}

    public $onInit(): void {
        this.storageEngines = this.storageFactory.getEnabledEngines();
        this.logger.info(`Storage engines enabled: ${this.backends.join(", ")}`);
    }

    public $afterInit(): void {
        const engine = this.activeEngine;
        this.logger.info(`New uploads are stored with the ${engine.id} storage engine`);
    }

    public get engines(): IStorageEngine[] {
        return this.storageEngines;
    }

    public get backends(): StorageBackend[] {
        return this.storageEngines.map(engine => engine.id);
    }

    public get activeEngine(): IStorageEngine {
        const backend = this.settingsService.getSetting(GlobalEnv.STORAGE_BACKEND) as StorageBackend;
        const engine = this.storageFactory.getEngine(backend);
        if (!engine) {
            throw new Error(
                `STORAGE_BACKEND is "${backend}" but no storage engine is enabled for it. Valid values are "local" and "s3", and "s3" requires S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY to be set`,
            );
        }
        return engine;
    }

    public engineFor(backend: StorageBackend): IStorageEngine {
        const engine = this.storageFactory.getEngine(backend);
        if (!engine) {
            throw new Error(`No storage engine is enabled for backend "${backend}"`);
        }
        return engine;
    }
}
