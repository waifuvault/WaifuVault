import { MigrationInterface, QueryRunner } from "typeorm";

export class JoinOnThumbs1740329403014 implements MigrationInterface {
    name = 'JoinOnThumbs1740329403014'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "file_upload_model" ADD "thumbnailCacheId" integer`);
        await queryRunner.query(`ALTER TABLE "file_upload_model" ADD CONSTRAINT "UQ_1be91ec8553307db1e902527445" UNIQUE ("thumbnailCacheId")`);
        await queryRunner.query(`ALTER TABLE "file_upload_model" ADD CONSTRAINT "FK_1be91ec8553307db1e902527445" FOREIGN KEY ("thumbnailCacheId") REFERENCES "thumbnail_cache_model"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "file_upload_model" DROP CONSTRAINT "FK_1be91ec8553307db1e902527445"`);
        await queryRunner.query(`ALTER TABLE "file_upload_model" DROP CONSTRAINT "UQ_1be91ec8553307db1e902527445"`);
        await queryRunner.query(`ALTER TABLE "file_upload_model" DROP COLUMN "thumbnailCacheId"`);
    }

}
