import type { ClientRateLimitInfo, IncrementResponse, Options, Store } from "express-rate-limit";
import { DataSource, LessThan, Repository } from "typeorm";
import { ExpressRateLimitStoreModel } from "../../../model/db/ExpressRateLimitStore.model.js";
import { Builder } from "builder-pattern";
import { Inject, Injectable } from "@tsed/di";
import { SQLITE_DATA_SOURCE } from "../../../model/di/tokens.js";
import { ScheduleService } from "../../../services/ScheduleService.js";

@Injectable()
export class ExpressRateLimitTypeOrmStore implements Store {
    private windowMs: number;

    private repo: Repository<ExpressRateLimitStoreModel>;

    public constructor(
        @Inject(SQLITE_DATA_SOURCE) ds: DataSource,
        @Inject() private scheduleService: ScheduleService,
    ) {
        this.repo = ds.getRepository(ExpressRateLimitStoreModel);
    }

    public init(options: Options): void {
        this.windowMs = options.windowMs;
        this.scheduleService.scheduleJobInterval(
            {
                milliseconds: this.windowMs,
            },
            this.clearExpired,
            "rateLimiter",
            this,
        );
    }

    private async clearExpired(): Promise<void> {
        await this.repo.delete({
            resetTime: LessThan(new Date()),
        });
    }

    public async get(key: string): Promise<ClientRateLimitInfo | undefined> {
        const fromDb = await this.getFromDb(key);
        if (fromDb) {
            return this.transform(fromDb);
        }
    }

    private async getResponse(key: string): Promise<ExpressRateLimitStoreModel> {
        const fromDb = await this.getFromDb(key);
        if (fromDb) {
            return fromDb;
        }
        const newModel = Builder(ExpressRateLimitStoreModel)
            .key(key)
            .resetTime(new Date(Date.now() + this.windowMs))
            .totalHits(0)
            .build();
        return this.repo.save(newModel);
    }

    public async increment(key: string): Promise<IncrementResponse> {
        const resp = await this.getResponse(key);
        const now = Date.now();
        if (resp.resetTime && resp.resetTime.getTime() <= now) {
            this.resetClient(resp, now);
        }
        resp.totalHits++;
        return this.transform(await this.repo.save(resp));
    }

    private resetClient(client: ExpressRateLimitStoreModel, now = Date.now()): IncrementResponse {
        client.totalHits = 0;
        client.resetTime.setTime(now + this.windowMs);
        return client;
    }
    public async decrement(key: string): Promise<void> {
        const fromDb = await this.getFromDb(key);
        if (!fromDb) {
            return;
        }
        if (--fromDb.totalHits <= 0) {
            await this.repo.delete({
                key,
            });
        } else {
            await this.repo.save(fromDb);
        }
    }

    public async resetKey(key: string): Promise<void> {
        await this.repo.delete({
            key,
        });
    }

    public async resetAll(): Promise<void> {
        // does this delete everything?
        await this.repo.delete({});
    }

    private transform(model: ExpressRateLimitStoreModel): ClientRateLimitInfo {
        return {
            totalHits: model.totalHits,
            resetTime: model.resetTime,
        };
    }

    private getFromDb(key: string): Promise<ExpressRateLimitStoreModel | null> {
        return this.repo.findOneBy({
            key,
        });
    }
}
