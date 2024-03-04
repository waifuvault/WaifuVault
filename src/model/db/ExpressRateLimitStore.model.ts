import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class ExpressRateLimitStoreModel {
    @PrimaryColumn()
    public key: string;

    @Column()
    public totalHits: number;

    @Column()
    public resetTime: Date;
}
