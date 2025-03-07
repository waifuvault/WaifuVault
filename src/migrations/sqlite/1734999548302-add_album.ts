import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAlbum1734999548302 implements MigrationInterface {
    name = 'AddAlbum1734999548302'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "album_model" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "name" text NOT NULL, "bucketToken" text NOT NULL, "albumToken" text NOT NULL)`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8a2f2dde7072de099e6ae8b452" ON "album_model" ("bucketToken", "name") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_d2d1f33e971f83bea806abd569" ON "album_model" ("albumToken") `);
        await queryRunner.query(`DROP INDEX "IDX_c8524f9ddc7a24cbae2013fe97"`);
        await queryRunner.query(`CREATE TABLE "temporary_file_upload_model" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "fileName" text NOT NULL, "token" text NOT NULL, "checksum" text NOT NULL, "ip" text NOT NULL, "fileSize" integer NOT NULL, "expires" integer, "originalFileName" text NOT NULL DEFAULT (''), "fileExtension" text, "settings" text, "mediaType" text, "encrypted" boolean NOT NULL DEFAULT (0), "bucketToken" text, "views" integer NOT NULL DEFAULT (0), "albumToken" text, CONSTRAINT "FK_029f07bda290e6cb26217394406" FOREIGN KEY ("bucketToken") REFERENCES "bucket_model" ("bucketToken") ON DELETE CASCADE ON UPDATE CASCADE)`);
        await queryRunner.query(`INSERT INTO "temporary_file_upload_model"("id", "createdAt", "updatedAt", "fileName", "token", "checksum", "ip", "fileSize", "expires", "originalFileName", "fileExtension", "settings", "mediaType", "encrypted", "bucketToken", "views") SELECT "id", "createdAt", "updatedAt", "fileName", "token", "checksum", "ip", "fileSize", "expires", "originalFileName", "fileExtension", "settings", "mediaType", "encrypted", "bucketToken", "views" FROM "file_upload_model"`);
        await queryRunner.query(`DROP TABLE "file_upload_model"`);
        await queryRunner.query(`ALTER TABLE "temporary_file_upload_model" RENAME TO "file_upload_model"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c8524f9ddc7a24cbae2013fe97" ON "file_upload_model" ("token") `);
        await queryRunner.query(`DROP INDEX "IDX_8a2f2dde7072de099e6ae8b452"`);
        await queryRunner.query(`DROP INDEX "IDX_d2d1f33e971f83bea806abd569"`);
        await queryRunner.query(`CREATE TABLE "temporary_album_model" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "name" text NOT NULL, "bucketToken" text NOT NULL, "albumToken" text NOT NULL, CONSTRAINT "FK_0d9d4e46c235e6c4815b35c8512" FOREIGN KEY ("bucketToken") REFERENCES "bucket_model" ("bucketToken") ON DELETE CASCADE ON UPDATE CASCADE)`);
        await queryRunner.query(`INSERT INTO "temporary_album_model"("id", "createdAt", "updatedAt", "name", "bucketToken", "albumToken") SELECT "id", "createdAt", "updatedAt", "name", "bucketToken", "albumToken" FROM "album_model"`);
        await queryRunner.query(`DROP TABLE "album_model"`);
        await queryRunner.query(`ALTER TABLE "temporary_album_model" RENAME TO "album_model"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8a2f2dde7072de099e6ae8b452" ON "album_model" ("bucketToken", "name") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_d2d1f33e971f83bea806abd569" ON "album_model" ("albumToken") `);
        await queryRunner.query(`DROP INDEX "IDX_c8524f9ddc7a24cbae2013fe97"`);
        await queryRunner.query(`CREATE TABLE "temporary_file_upload_model" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "fileName" text NOT NULL, "token" text NOT NULL, "checksum" text NOT NULL, "ip" text NOT NULL, "fileSize" integer NOT NULL, "expires" integer, "originalFileName" text NOT NULL DEFAULT (''), "fileExtension" text, "settings" text, "mediaType" text, "encrypted" boolean NOT NULL DEFAULT (0), "bucketToken" text, "views" integer NOT NULL DEFAULT (0), "albumToken" text, CONSTRAINT "FK_029f07bda290e6cb26217394406" FOREIGN KEY ("bucketToken") REFERENCES "bucket_model" ("bucketToken") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "FK_1be00fe7085362efb712c4a97b5" FOREIGN KEY ("albumToken") REFERENCES "album_model" ("albumToken") ON DELETE CASCADE ON UPDATE CASCADE)`);
        await queryRunner.query(`INSERT INTO "temporary_file_upload_model"("id", "createdAt", "updatedAt", "fileName", "token", "checksum", "ip", "fileSize", "expires", "originalFileName", "fileExtension", "settings", "mediaType", "encrypted", "bucketToken", "views", "albumToken") SELECT "id", "createdAt", "updatedAt", "fileName", "token", "checksum", "ip", "fileSize", "expires", "originalFileName", "fileExtension", "settings", "mediaType", "encrypted", "bucketToken", "views", "albumToken" FROM "file_upload_model"`);
        await queryRunner.query(`DROP TABLE "file_upload_model"`);
        await queryRunner.query(`ALTER TABLE "temporary_file_upload_model" RENAME TO "file_upload_model"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c8524f9ddc7a24cbae2013fe97" ON "file_upload_model" ("token") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_c8524f9ddc7a24cbae2013fe97"`);
        await queryRunner.query(`ALTER TABLE "file_upload_model" RENAME TO "temporary_file_upload_model"`);
        await queryRunner.query(`CREATE TABLE "file_upload_model" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "fileName" text NOT NULL, "token" text NOT NULL, "checksum" text NOT NULL, "ip" text NOT NULL, "fileSize" integer NOT NULL, "expires" integer, "originalFileName" text NOT NULL DEFAULT (''), "fileExtension" text, "settings" text, "mediaType" text, "encrypted" boolean NOT NULL DEFAULT (0), "bucketToken" text, "views" integer NOT NULL DEFAULT (0), "albumToken" text, CONSTRAINT "FK_029f07bda290e6cb26217394406" FOREIGN KEY ("bucketToken") REFERENCES "bucket_model" ("bucketToken") ON DELETE CASCADE ON UPDATE CASCADE)`);
        await queryRunner.query(`INSERT INTO "file_upload_model"("id", "createdAt", "updatedAt", "fileName", "token", "checksum", "ip", "fileSize", "expires", "originalFileName", "fileExtension", "settings", "mediaType", "encrypted", "bucketToken", "views", "albumToken") SELECT "id", "createdAt", "updatedAt", "fileName", "token", "checksum", "ip", "fileSize", "expires", "originalFileName", "fileExtension", "settings", "mediaType", "encrypted", "bucketToken", "views", "albumToken" FROM "temporary_file_upload_model"`);
        await queryRunner.query(`DROP TABLE "temporary_file_upload_model"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c8524f9ddc7a24cbae2013fe97" ON "file_upload_model" ("token") `);
        await queryRunner.query(`DROP INDEX "IDX_d2d1f33e971f83bea806abd569"`);
        await queryRunner.query(`DROP INDEX "IDX_8a2f2dde7072de099e6ae8b452"`);
        await queryRunner.query(`ALTER TABLE "album_model" RENAME TO "temporary_album_model"`);
        await queryRunner.query(`CREATE TABLE "album_model" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "name" text NOT NULL, "bucketToken" text NOT NULL, "albumToken" text NOT NULL)`);
        await queryRunner.query(`INSERT INTO "album_model"("id", "createdAt", "updatedAt", "name", "bucketToken", "albumToken") SELECT "id", "createdAt", "updatedAt", "name", "bucketToken", "albumToken" FROM "temporary_album_model"`);
        await queryRunner.query(`DROP TABLE "temporary_album_model"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_d2d1f33e971f83bea806abd569" ON "album_model" ("albumToken") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8a2f2dde7072de099e6ae8b452" ON "album_model" ("bucketToken", "name") `);
        await queryRunner.query(`DROP INDEX "IDX_c8524f9ddc7a24cbae2013fe97"`);
        await queryRunner.query(`ALTER TABLE "file_upload_model" RENAME TO "temporary_file_upload_model"`);
        await queryRunner.query(`CREATE TABLE "file_upload_model" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "fileName" text NOT NULL, "token" text NOT NULL, "checksum" text NOT NULL, "ip" text NOT NULL, "fileSize" integer NOT NULL, "expires" integer, "originalFileName" text NOT NULL DEFAULT (''), "fileExtension" text, "settings" text, "mediaType" text, "encrypted" boolean NOT NULL DEFAULT (0), "bucketToken" text, "views" integer NOT NULL DEFAULT (0), CONSTRAINT "FK_029f07bda290e6cb26217394406" FOREIGN KEY ("bucketToken") REFERENCES "bucket_model" ("bucketToken") ON DELETE CASCADE ON UPDATE CASCADE)`);
        await queryRunner.query(`INSERT INTO "file_upload_model"("id", "createdAt", "updatedAt", "fileName", "token", "checksum", "ip", "fileSize", "expires", "originalFileName", "fileExtension", "settings", "mediaType", "encrypted", "bucketToken", "views") SELECT "id", "createdAt", "updatedAt", "fileName", "token", "checksum", "ip", "fileSize", "expires", "originalFileName", "fileExtension", "settings", "mediaType", "encrypted", "bucketToken", "views" FROM "temporary_file_upload_model"`);
        await queryRunner.query(`DROP TABLE "temporary_file_upload_model"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c8524f9ddc7a24cbae2013fe97" ON "file_upload_model" ("token") `);
        await queryRunner.query(`DROP INDEX "IDX_d2d1f33e971f83bea806abd569"`);
        await queryRunner.query(`DROP INDEX "IDX_8a2f2dde7072de099e6ae8b452"`);
        await queryRunner.query(`DROP TABLE "album_model"`);
    }

}
