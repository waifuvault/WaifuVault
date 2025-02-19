import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBucketType1726652384908 implements MigrationInterface {
    name = 'AddBucketType1726652384908'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_74d7bc76abfc080b96e42ddac7"`);
        await queryRunner.query(`CREATE TABLE "temporary_bucket_model" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "bucketToken" text NOT NULL, "ip" text NOT NULL, "type" text NOT NULL DEFAULT ('NORMAL'), CONSTRAINT "UQ_092bd6d7824bd16ceee201ac5c6" UNIQUE ("ip"))`);
        await queryRunner.query(`INSERT INTO "temporary_bucket_model"("id", "createdAt", "updatedAt", "bucketToken", "ip") SELECT "id", "createdAt", "updatedAt", "bucketToken", "ip" FROM "bucket_model"`);
        await queryRunner.query(`DROP TABLE "bucket_model"`);
        await queryRunner.query(`ALTER TABLE "temporary_bucket_model" RENAME TO "bucket_model"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_74d7bc76abfc080b96e42ddac7" ON "bucket_model" ("bucketToken") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_74d7bc76abfc080b96e42ddac7"`);
        await queryRunner.query(`ALTER TABLE "bucket_model" RENAME TO "temporary_bucket_model"`);
        await queryRunner.query(`CREATE TABLE "bucket_model" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "bucketToken" text NOT NULL, "ip" text NOT NULL, CONSTRAINT "UQ_092bd6d7824bd16ceee201ac5c6" UNIQUE ("ip"))`);
        await queryRunner.query(`INSERT INTO "bucket_model"("id", "createdAt", "updatedAt", "bucketToken", "ip") SELECT "id", "createdAt", "updatedAt", "bucketToken", "ip" FROM "temporary_bucket_model"`);
        await queryRunner.query(`DROP TABLE "temporary_bucket_model"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_74d7bc76abfc080b96e42ddac7" ON "bucket_model" ("bucketToken") `);
    }

}
