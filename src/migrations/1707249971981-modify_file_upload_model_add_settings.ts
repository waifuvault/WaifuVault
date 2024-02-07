import { MigrationInterface, QueryRunner } from "typeorm";

export class ModifyFileUploadModelAddSettings1707249971981 implements MigrationInterface {
    name = 'ModifyFileUploadModelAddSettings1707249971981'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_c8524f9ddc7a24cbae2013fe97"`);
        await queryRunner.query(`CREATE TABLE "temporary_file_upload_model" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "fileName" text NOT NULL, "token" text NOT NULL, "checksum" text NOT NULL, "ip" text NOT NULL, "fileSize" integer NOT NULL, "customExpires" integer, "originalFileName" text NOT NULL DEFAULT (''), "fileExtension" text, "settings" text)`);
        await queryRunner.query(`INSERT INTO "temporary_file_upload_model"("id", "createdAt", "updatedAt", "fileName", "token", "checksum", "ip", "fileSize", "customExpires", "originalFileName", "fileExtension") SELECT "id", "createdAt", "updatedAt", "fileName", "token", "checksum", "ip", "fileSize", "customExpires", "originalFileName", "fileExtension" FROM "file_upload_model"`);
        await queryRunner.query(`DROP TABLE "file_upload_model"`);
        await queryRunner.query(`ALTER TABLE "temporary_file_upload_model" RENAME TO "file_upload_model"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c8524f9ddc7a24cbae2013fe97" ON "file_upload_model" ("token") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_c8524f9ddc7a24cbae2013fe97"`);
        await queryRunner.query(`ALTER TABLE "file_upload_model" RENAME TO "temporary_file_upload_model"`);
        await queryRunner.query(`CREATE TABLE "file_upload_model" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "fileName" text NOT NULL, "token" text NOT NULL, "checksum" text NOT NULL, "ip" text NOT NULL, "fileSize" integer NOT NULL, "customExpires" integer, "originalFileName" text NOT NULL DEFAULT (''), "fileExtension" text)`);
        await queryRunner.query(`INSERT INTO "file_upload_model"("id", "createdAt", "updatedAt", "fileName", "token", "checksum", "ip", "fileSize", "customExpires", "originalFileName", "fileExtension") SELECT "id", "createdAt", "updatedAt", "fileName", "token", "checksum", "ip", "fileSize", "customExpires", "originalFileName", "fileExtension" FROM "temporary_file_upload_model"`);
        await queryRunner.query(`DROP TABLE "temporary_file_upload_model"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c8524f9ddc7a24cbae2013fe97" ON "file_upload_model" ("token") `);
    }

}
