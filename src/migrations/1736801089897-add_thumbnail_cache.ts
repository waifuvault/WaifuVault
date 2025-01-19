import { MigrationInterface, QueryRunner } from "typeorm";

export class AddThumbnailCache1736801089897 implements MigrationInterface {
    name = 'AddThumbnailCache1736801089897'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "thumbnail_cache_model" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "data" text NOT NULL, "fileId" integer, CONSTRAINT "REL_cfe7839365243cdbaeeccbaf55" UNIQUE ("fileId"))`);
        await queryRunner.query(`CREATE TABLE "temporary_thumbnail_cache_model" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "data" text NOT NULL, "fileId" integer, CONSTRAINT "REL_cfe7839365243cdbaeeccbaf55" UNIQUE ("fileId"), CONSTRAINT "FK_cfe7839365243cdbaeeccbaf551" FOREIGN KEY ("fileId") REFERENCES "file_upload_model" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`);
        await queryRunner.query(`INSERT INTO "temporary_thumbnail_cache_model"("id", "createdAt", "updatedAt", "data", "fileId") SELECT "id", "createdAt", "updatedAt", "data", "fileId" FROM "thumbnail_cache_model"`);
        await queryRunner.query(`DROP TABLE "thumbnail_cache_model"`);
        await queryRunner.query(`ALTER TABLE "temporary_thumbnail_cache_model" RENAME TO "thumbnail_cache_model"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "thumbnail_cache_model" RENAME TO "temporary_thumbnail_cache_model"`);
        await queryRunner.query(`CREATE TABLE "thumbnail_cache_model" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "data" text NOT NULL, "fileId" integer, CONSTRAINT "REL_cfe7839365243cdbaeeccbaf55" UNIQUE ("fileId"))`);
        await queryRunner.query(`INSERT INTO "thumbnail_cache_model"("id", "createdAt", "updatedAt", "data", "fileId") SELECT "id", "createdAt", "updatedAt", "data", "fileId" FROM "temporary_thumbnail_cache_model"`);
        await queryRunner.query(`DROP TABLE "temporary_thumbnail_cache_model"`);
        await queryRunner.query(`DROP TABLE "thumbnail_cache_model"`);
    }

}
