import type { MigrationInterface, QueryRunner } from "typeorm";

export class Initial1707171435920 implements MigrationInterface {
    name = 'Initial1707171435920'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user_model" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "password" varchar NOT NULL, "email" varchar NOT NULL)`);
        await queryRunner.query(`CREATE TABLE "file_upload_model" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "fileName" text NOT NULL, "token" text NOT NULL, "checksum" text NOT NULL, "ip" text NOT NULL, "fileSize" integer NOT NULL, "customExpires" integer)`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c8524f9ddc7a24cbae2013fe97" ON "file_upload_model" ("token") `);
        await queryRunner.query(`CREATE TABLE "session_model" ("expiredAt" bigint NOT NULL, "id" varchar(255) PRIMARY KEY NOT NULL, "json" text NOT NULL, "destroyedAt" datetime)`);
        await queryRunner.query(`CREATE INDEX "IDX_7992668fc9dea8e1e06c9f16d6" ON "session_model" ("expiredAt") `);
        await queryRunner.query(`CREATE TABLE "ip_black_list_model" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "ip" text NOT NULL, CONSTRAINT "UQ_ed072e5e10f4df0012568abeb04" UNIQUE ("ip"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "ip_black_list_model"`);
        await queryRunner.query(`DROP INDEX "IDX_7992668fc9dea8e1e06c9f16d6"`);
        await queryRunner.query(`DROP TABLE "session_model"`);
        await queryRunner.query(`DROP INDEX "IDX_c8524f9ddc7a24cbae2013fe97"`);
        await queryRunner.query(`DROP TABLE "file_upload_model"`);
        await queryRunner.query(`DROP TABLE "user_model"`);
    }

}
