import { MigrationInterface, QueryRunner } from "typeorm";

export class AddViewsAndPublicTokenToAlbum1735321968893 implements MigrationInterface {
    name = 'AddViewsAndPublicTokenToAlbum1735321968893'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_d2d1f33e971f83bea806abd569"`);
        await queryRunner.query(`DROP INDEX "IDX_8a2f2dde7072de099e6ae8b452"`);
        await queryRunner.query(`CREATE TABLE "temporary_album_model" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "name" text NOT NULL, "bucketToken" text NOT NULL, "albumToken" text NOT NULL, "publicToken" text, "views" integer NOT NULL DEFAULT (0), CONSTRAINT "UQ_a50a20c92e0639c2fa4d034b477" UNIQUE ("publicToken"), CONSTRAINT "FK_0d9d4e46c235e6c4815b35c8512" FOREIGN KEY ("bucketToken") REFERENCES "bucket_model" ("bucketToken") ON DELETE CASCADE ON UPDATE CASCADE)`);
        await queryRunner.query(`INSERT INTO "temporary_album_model"("id", "createdAt", "updatedAt", "name", "bucketToken", "albumToken") SELECT "id", "createdAt", "updatedAt", "name", "bucketToken", "albumToken" FROM "album_model"`);
        await queryRunner.query(`DROP TABLE "album_model"`);
        await queryRunner.query(`ALTER TABLE "temporary_album_model" RENAME TO "album_model"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_d2d1f33e971f83bea806abd569" ON "album_model" ("albumToken") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8a2f2dde7072de099e6ae8b452" ON "album_model" ("bucketToken", "name") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_8a2f2dde7072de099e6ae8b452"`);
        await queryRunner.query(`DROP INDEX "IDX_d2d1f33e971f83bea806abd569"`);
        await queryRunner.query(`ALTER TABLE "album_model" RENAME TO "temporary_album_model"`);
        await queryRunner.query(`CREATE TABLE "album_model" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "name" text NOT NULL, "bucketToken" text NOT NULL, "albumToken" text NOT NULL, CONSTRAINT "FK_0d9d4e46c235e6c4815b35c8512" FOREIGN KEY ("bucketToken") REFERENCES "bucket_model" ("bucketToken") ON DELETE CASCADE ON UPDATE CASCADE)`);
        await queryRunner.query(`INSERT INTO "album_model"("id", "createdAt", "updatedAt", "name", "bucketToken", "albumToken") SELECT "id", "createdAt", "updatedAt", "name", "bucketToken", "albumToken" FROM "temporary_album_model"`);
        await queryRunner.query(`DROP TABLE "temporary_album_model"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8a2f2dde7072de099e6ae8b452" ON "album_model" ("bucketToken", "name") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_d2d1f33e971f83bea806abd569" ON "album_model" ("albumToken") `);
    }

}
