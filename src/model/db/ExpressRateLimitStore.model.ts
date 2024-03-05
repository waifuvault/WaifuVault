import { Column, Entity, PrimaryColumn } from "typeorm";
import type { IExpressRateLimitModel } from "typeorm-rate-limit-store";

@Entity()
export class ExpressRateLimitStoreModel implements IExpressRateLimitModel {
    @PrimaryColumn()
    public key: string;

    @Column()
    public totalHits: number;

    @Column()
    public resetTime: Date;
}
