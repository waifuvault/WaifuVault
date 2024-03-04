import { MigrationInterface, QueryRunner } from "typeorm";

export class ExpressTypeormRateTable1709586577877 implements MigrationInterface {
    name = 'ExpressTypeormRateTable1709586577877'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "express_rate_limit_store_model" ("key" varchar PRIMARY KEY NOT NULL, "totalHits" integer NOT NULL, "resetTime" datetime NOT NULL)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "express_rate_limit_store_model"`);
    }

}
