import { MigrationInterface, QueryRunner } from "typeorm";

export class AlignForPostgres1739986579257 implements MigrationInterface {
    name = 'AlignForPostgres1739986579257'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_c8524f9ddc7a24cbae2013fe97"`);
        await queryRunner.query(`CREATE TABLE "temporary_file_upload_model" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "fileName" text NOT NULL, "token" text NOT NULL, "checksum" text NOT NULL, "ip" text, "fileSize" numeric NOT NULL, "expires" numeric, "originalFileName" text NOT NULL DEFAULT (''), "fileExtension" text, "settings" text, "mediaType" text, "encrypted" boolean NOT NULL DEFAULT (0), "bucketToken" text, "views" integer NOT NULL DEFAULT (0), "albumToken" text, CONSTRAINT "FK_029f07bda290e6cb26217394406" FOREIGN KEY ("bucketToken") REFERENCES "bucket_model" ("bucketToken") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "FK_1be00fe7085362efb712c4a97b5" FOREIGN KEY ("albumToken") REFERENCES "album_model" ("albumToken") ON DELETE CASCADE ON UPDATE CASCADE)`);
        await queryRunner.query(`INSERT INTO "temporary_file_upload_model"("id", "createdAt", "updatedAt", "fileName", "token", "checksum", "ip", "fileSize", "expires", "originalFileName", "fileExtension", "settings", "mediaType", "encrypted", "bucketToken", "views", "albumToken") SELECT "id", "createdAt", "updatedAt", "fileName", "token", "checksum", "ip", "fileSize", "expires", "originalFileName", "fileExtension", "settings", "mediaType", "encrypted", "bucketToken", "views", "albumToken" FROM "file_upload_model"`);
        await queryRunner.query(`DROP TABLE "file_upload_model"`);
        await queryRunner.query(`ALTER TABLE "temporary_file_upload_model" RENAME TO "file_upload_model"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c8524f9ddc7a24cbae2013fe97" ON "file_upload_model" ("token") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_c8524f9ddc7a24cbae2013fe97"`);
        await queryRunner.query(`ALTER TABLE "file_upload_model" RENAME TO "temporary_file_upload_model"`);
        await queryRunner.query(`CREATE TABLE "file_upload_model" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "fileName" text NOT NULL, "token" text NOT NULL, "checksum" text NOT NULL, "ip" text, "fileSize" integer NOT NULL, "expires" integer, "originalFileName" text NOT NULL DEFAULT (''), "fileExtension" text, "settings" text, "mediaType" text, "encrypted" boolean NOT NULL DEFAULT (0), "bucketToken" text, "views" integer NOT NULL DEFAULT (0), "albumToken" text, CONSTRAINT "FK_029f07bda290e6cb26217394406" FOREIGN KEY ("bucketToken") REFERENCES "bucket_model" ("bucketToken") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "FK_1be00fe7085362efb712c4a97b5" FOREIGN KEY ("albumToken") REFERENCES "album_model" ("albumToken") ON DELETE CASCADE ON UPDATE CASCADE)`);
        await queryRunner.query(`INSERT INTO "file_upload_model"("id", "createdAt", "updatedAt", "fileName", "token", "checksum", "ip", "fileSize", "expires", "originalFileName", "fileExtension", "settings", "mediaType", "encrypted", "bucketToken", "views", "albumToken") SELECT "id", "createdAt", "updatedAt", "fileName", "token", "checksum", "ip", "fileSize", "expires", "originalFileName", "fileExtension", "settings", "mediaType", "encrypted", "bucketToken", "views", "albumToken" FROM "temporary_file_upload_model"`);
        await queryRunner.query(`DROP TABLE "temporary_file_upload_model"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c8524f9ddc7a24cbae2013fe97" ON "file_upload_model" ("token") `);
    }

}
