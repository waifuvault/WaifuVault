import { MigrationInterface, QueryRunner } from "typeorm";

export class IndexOnThumbs1740326716625 implements MigrationInterface {
    name = 'IndexOnThumbs1740326716625'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "thumbnail_cache_model" DROP CONSTRAINT "FK_cfe7839365243cdbaeeccbaf551"`);
        await queryRunner.query(`ALTER TABLE "thumbnail_cache_model" ALTER COLUMN "fileId" SET NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_cfe7839365243cdbaeeccbaf55" ON "thumbnail_cache_model" ("fileId") `);
        await queryRunner.query(`ALTER TABLE "thumbnail_cache_model" ADD CONSTRAINT "FK_cfe7839365243cdbaeeccbaf551" FOREIGN KEY ("fileId") REFERENCES "file_upload_model"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "thumbnail_cache_model" DROP CONSTRAINT "FK_cfe7839365243cdbaeeccbaf551"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cfe7839365243cdbaeeccbaf55"`);
        await queryRunner.query(`ALTER TABLE "thumbnail_cache_model" ALTER COLUMN "fileId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "thumbnail_cache_model" ADD CONSTRAINT "FK_cfe7839365243cdbaeeccbaf551" FOREIGN KEY ("fileId") REFERENCES "file_upload_model"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

}
