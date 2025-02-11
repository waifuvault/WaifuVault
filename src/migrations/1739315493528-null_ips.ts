import { MigrationInterface, QueryRunner } from "typeorm";

export class NullIps1739315493528 implements MigrationInterface {
    name = 'NullIps1739315493528'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_74d7bc76abfc080b96e42ddac7"`);
        await queryRunner.query(`CREATE TABLE "temporary_bucket_model" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "bucketToken" text NOT NULL, "ip" text NOT NULL, "type" text NOT NULL DEFAULT ('NORMAL'), CONSTRAINT "UQ_092bd6d7824bd16ceee201ac5c6" UNIQUE ("ip"))`);
        await queryRunner.query(`INSERT INTO "temporary_bucket_model"("id", "createdAt", "updatedAt", "bucketToken", "ip", "type") SELECT "id", "createdAt", "updatedAt", "bucketToken", "ip", "type" FROM "bucket_model"`);
        await queryRunner.query(`DROP TABLE "bucket_model"`);
        await queryRunner.query(`ALTER TABLE "temporary_bucket_model" RENAME TO "bucket_model"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_74d7bc76abfc080b96e42ddac7" ON "bucket_model" ("bucketToken") `);
        await queryRunner.query(`DROP INDEX "IDX_c8524f9ddc7a24cbae2013fe97"`);
        await queryRunner.query(`CREATE TABLE "temporary_file_upload_model" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "fileName" text NOT NULL, "token" text NOT NULL, "checksum" text NOT NULL, "ip" text NOT NULL, "fileSize" integer NOT NULL, "expires" integer, "originalFileName" text NOT NULL DEFAULT (''), "fileExtension" text, "settings" text, "mediaType" text, "encrypted" boolean NOT NULL DEFAULT (0), "bucketToken" text, "views" integer NOT NULL DEFAULT (0), "albumToken" text, CONSTRAINT "FK_1be00fe7085362efb712c4a97b5" FOREIGN KEY ("albumToken") REFERENCES "album_model" ("albumToken") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "FK_029f07bda290e6cb26217394406" FOREIGN KEY ("bucketToken") REFERENCES "bucket_model" ("bucketToken") ON DELETE CASCADE ON UPDATE CASCADE)`);
        await queryRunner.query(`INSERT INTO "temporary_file_upload_model"("id", "createdAt", "updatedAt", "fileName", "token", "checksum", "ip", "fileSize", "expires", "originalFileName", "fileExtension", "settings", "mediaType", "encrypted", "bucketToken", "views", "albumToken") SELECT "id", "createdAt", "updatedAt", "fileName", "token", "checksum", "ip", "fileSize", "expires", "originalFileName", "fileExtension", "settings", "mediaType", "encrypted", "bucketToken", "views", "albumToken" FROM "file_upload_model"`);
        await queryRunner.query(`DROP TABLE "file_upload_model"`);
        await queryRunner.query(`ALTER TABLE "temporary_file_upload_model" RENAME TO "file_upload_model"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c8524f9ddc7a24cbae2013fe97" ON "file_upload_model" ("token") `);
        await queryRunner.query(`DROP INDEX "IDX_74d7bc76abfc080b96e42ddac7"`);
        await queryRunner.query(`CREATE TABLE "temporary_bucket_model" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "bucketToken" text NOT NULL, "ip" text, "type" text NOT NULL DEFAULT ('NORMAL'), CONSTRAINT "UQ_092bd6d7824bd16ceee201ac5c6" UNIQUE ("ip"))`);
        await queryRunner.query(`INSERT INTO "temporary_bucket_model"("id", "createdAt", "updatedAt", "bucketToken", "ip", "type") SELECT "id", "createdAt", "updatedAt", "bucketToken", "ip", "type" FROM "bucket_model"`);
        await queryRunner.query(`DROP TABLE "bucket_model"`);
        await queryRunner.query(`ALTER TABLE "temporary_bucket_model" RENAME TO "bucket_model"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_74d7bc76abfc080b96e42ddac7" ON "bucket_model" ("bucketToken") `);
        await queryRunner.query(`DROP INDEX "IDX_c8524f9ddc7a24cbae2013fe97"`);
        await queryRunner.query(`CREATE TABLE "temporary_file_upload_model" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "fileName" text NOT NULL, "token" text NOT NULL, "checksum" text NOT NULL, "ip" text, "fileSize" integer NOT NULL, "expires" integer, "originalFileName" text NOT NULL DEFAULT (''), "fileExtension" text, "settings" text, "mediaType" text, "encrypted" boolean NOT NULL DEFAULT (0), "bucketToken" text, "views" integer NOT NULL DEFAULT (0), "albumToken" text, CONSTRAINT "FK_1be00fe7085362efb712c4a97b5" FOREIGN KEY ("albumToken") REFERENCES "album_model" ("albumToken") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "FK_029f07bda290e6cb26217394406" FOREIGN KEY ("bucketToken") REFERENCES "bucket_model" ("bucketToken") ON DELETE CASCADE ON UPDATE CASCADE)`);
        await queryRunner.query(`INSERT INTO "temporary_file_upload_model"("id", "createdAt", "updatedAt", "fileName", "token", "checksum", "ip", "fileSize", "expires", "originalFileName", "fileExtension", "settings", "mediaType", "encrypted", "bucketToken", "views", "albumToken") SELECT "id", "createdAt", "updatedAt", "fileName", "token", "checksum", "ip", "fileSize", "expires", "originalFileName", "fileExtension", "settings", "mediaType", "encrypted", "bucketToken", "views", "albumToken" FROM "file_upload_model"`);
        await queryRunner.query(`DROP TABLE "file_upload_model"`);
        await queryRunner.query(`ALTER TABLE "temporary_file_upload_model" RENAME TO "file_upload_model"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c8524f9ddc7a24cbae2013fe97" ON "file_upload_model" ("token") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_c8524f9ddc7a24cbae2013fe97"`);
        await queryRunner.query(`ALTER TABLE "file_upload_model" RENAME TO "temporary_file_upload_model"`);
        await queryRunner.query(`CREATE TABLE "file_upload_model" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "fileName" text NOT NULL, "token" text NOT NULL, "checksum" text NOT NULL, "ip" text NOT NULL, "fileSize" integer NOT NULL, "expires" integer, "originalFileName" text NOT NULL DEFAULT (''), "fileExtension" text, "settings" text, "mediaType" text, "encrypted" boolean NOT NULL DEFAULT (0), "bucketToken" text, "views" integer NOT NULL DEFAULT (0), "albumToken" text, CONSTRAINT "FK_1be00fe7085362efb712c4a97b5" FOREIGN KEY ("albumToken") REFERENCES "album_model" ("albumToken") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "FK_029f07bda290e6cb26217394406" FOREIGN KEY ("bucketToken") REFERENCES "bucket_model" ("bucketToken") ON DELETE CASCADE ON UPDATE CASCADE)`);
        await queryRunner.query(`INSERT INTO "file_upload_model"("id", "createdAt", "updatedAt", "fileName", "token", "checksum", "ip", "fileSize", "expires", "originalFileName", "fileExtension", "settings", "mediaType", "encrypted", "bucketToken", "views", "albumToken") SELECT "id", "createdAt", "updatedAt", "fileName", "token", "checksum", "ip", "fileSize", "expires", "originalFileName", "fileExtension", "settings", "mediaType", "encrypted", "bucketToken", "views", "albumToken" FROM "temporary_file_upload_model"`);
        await queryRunner.query(`DROP TABLE "temporary_file_upload_model"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c8524f9ddc7a24cbae2013fe97" ON "file_upload_model" ("token") `);
        await queryRunner.query(`DROP INDEX "IDX_74d7bc76abfc080b96e42ddac7"`);
        await queryRunner.query(`ALTER TABLE "bucket_model" RENAME TO "temporary_bucket_model"`);
        await queryRunner.query(`CREATE TABLE "bucket_model" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "bucketToken" text NOT NULL, "ip" text NOT NULL, "type" text NOT NULL DEFAULT ('NORMAL'), CONSTRAINT "UQ_092bd6d7824bd16ceee201ac5c6" UNIQUE ("ip"))`);
        await queryRunner.query(`INSERT INTO "bucket_model"("id", "createdAt", "updatedAt", "bucketToken", "ip", "type") SELECT "id", "createdAt", "updatedAt", "bucketToken", "ip", "type" FROM "temporary_bucket_model"`);
        await queryRunner.query(`DROP TABLE "temporary_bucket_model"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_74d7bc76abfc080b96e42ddac7" ON "bucket_model" ("bucketToken") `);
        await queryRunner.query(`DROP INDEX "IDX_c8524f9ddc7a24cbae2013fe97"`);
        await queryRunner.query(`ALTER TABLE "file_upload_model" RENAME TO "temporary_file_upload_model"`);
        await queryRunner.query(`CREATE TABLE "file_upload_model" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "fileName" text NOT NULL, "token" text NOT NULL, "checksum" text NOT NULL, "ip" text NOT NULL, "fileSize" integer NOT NULL, "expires" integer, "originalFileName" text NOT NULL DEFAULT (''), "fileExtension" text, "settings" text, "mediaType" text, "encrypted" boolean NOT NULL DEFAULT (0), "bucketToken" text, "views" integer NOT NULL DEFAULT (0), "albumToken" text, CONSTRAINT "FK_1be00fe7085362efb712c4a97b5" FOREIGN KEY ("albumToken") REFERENCES "album_model" ("albumToken") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "FK_029f07bda290e6cb26217394406" FOREIGN KEY ("bucketToken") REFERENCES "bucket_model" ("bucketToken") ON DELETE CASCADE ON UPDATE CASCADE)`);
        await queryRunner.query(`INSERT INTO "file_upload_model"("id", "createdAt", "updatedAt", "fileName", "token", "checksum", "ip", "fileSize", "expires", "originalFileName", "fileExtension", "settings", "mediaType", "encrypted", "bucketToken", "views", "albumToken") SELECT "id", "createdAt", "updatedAt", "fileName", "token", "checksum", "ip", "fileSize", "expires", "originalFileName", "fileExtension", "settings", "mediaType", "encrypted", "bucketToken", "views", "albumToken" FROM "temporary_file_upload_model"`);
        await queryRunner.query(`DROP TABLE "temporary_file_upload_model"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c8524f9ddc7a24cbae2013fe97" ON "file_upload_model" ("token") `);
        await queryRunner.query(`DROP INDEX "IDX_74d7bc76abfc080b96e42ddac7"`);
        await queryRunner.query(`ALTER TABLE "bucket_model" RENAME TO "temporary_bucket_model"`);
        await queryRunner.query(`CREATE TABLE "bucket_model" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "bucketToken" text NOT NULL, "ip" text NOT NULL, "type" text NOT NULL DEFAULT ('NORMAL'), CONSTRAINT "UQ_092bd6d7824bd16ceee201ac5c6" UNIQUE ("ip"))`);
        await queryRunner.query(`INSERT INTO "bucket_model"("id", "createdAt", "updatedAt", "bucketToken", "ip", "type") SELECT "id", "createdAt", "updatedAt", "bucketToken", "ip", "type" FROM "temporary_bucket_model"`);
        await queryRunner.query(`DROP TABLE "temporary_bucket_model"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_74d7bc76abfc080b96e42ddac7" ON "bucket_model" ("bucketToken") `);
    }

}
