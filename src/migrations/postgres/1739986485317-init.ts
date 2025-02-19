import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1739986485317 implements MigrationInterface {
    name = 'Init1739986485317'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "express_rate_limit_store_model" ("key" character varying NOT NULL, "totalHits" integer NOT NULL, "resetTime" TIMESTAMP NOT NULL, CONSTRAINT "PK_b1e08a66fc1f8ba85adfad94eaa" PRIMARY KEY ("key"))`);
        await queryRunner.query(`CREATE TABLE "session_model" ("expiredAt" bigint NOT NULL, "id" character varying(255) NOT NULL, "json" text NOT NULL, "destroyedAt" TIMESTAMP, CONSTRAINT "PK_3c8671916fb700dcbc8128a8768" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_7992668fc9dea8e1e06c9f16d6" ON "session_model" ("expiredAt") `);
        await queryRunner.query(`CREATE TABLE "ip_black_list_model" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "ip" text NOT NULL, CONSTRAINT "UQ_ed072e5e10f4df0012568abeb04" UNIQUE ("ip"), CONSTRAINT "PK_53168a5790c62d7a89cec538b93" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "thumbnail_cache_model" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "data" text NOT NULL, "fileId" integer, CONSTRAINT "REL_cfe7839365243cdbaeeccbaf55" UNIQUE ("fileId"), CONSTRAINT "PK_4db1e13d644b6deebc727b43abd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "bucket_model" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "bucketToken" text NOT NULL, "ip" text, "type" text NOT NULL DEFAULT 'NORMAL', CONSTRAINT "UQ_092bd6d7824bd16ceee201ac5c6" UNIQUE ("ip"), CONSTRAINT "PK_9898f681aef823d49b7c042b4fe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_74d7bc76abfc080b96e42ddac7" ON "bucket_model" ("bucketToken") `);
        await queryRunner.query(`CREATE TABLE "user_model" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "password" character varying NOT NULL, "email" character varying NOT NULL, CONSTRAINT "PK_7d6bfa71f4d6a1fa0af1f688327" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "album_model" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" text NOT NULL, "bucketToken" text NOT NULL, "albumToken" text NOT NULL, "publicToken" text, "views" integer NOT NULL DEFAULT '0', CONSTRAINT "UQ_3e0a4342ff6e3b370d28f26d7bb" UNIQUE ("publicToken"), CONSTRAINT "PK_5ac48594fe630f20bdc49593818" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8a2f2dde7072de099e6ae8b452" ON "album_model" ("bucketToken", "name") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_d2d1f33e971f83bea806abd569" ON "album_model" ("albumToken") `);
        await queryRunner.query(`CREATE TABLE "file_upload_model" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "fileName" text NOT NULL, "token" text NOT NULL, "checksum" text NOT NULL, "ip" text, "originalFileName" text NOT NULL DEFAULT '', "fileExtension" text, "fileSize" numeric NOT NULL, "expires" numeric, "settings" text, "mediaType" text, "encrypted" boolean NOT NULL DEFAULT false, "bucketToken" text, "albumToken" text, "views" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_d6de2308eefe8af478f4b6533e9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c8524f9ddc7a24cbae2013fe97" ON "file_upload_model" ("token") `);
        await queryRunner.query(`ALTER TABLE "thumbnail_cache_model" ADD CONSTRAINT "FK_cfe7839365243cdbaeeccbaf551" FOREIGN KEY ("fileId") REFERENCES "file_upload_model"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "album_model" ADD CONSTRAINT "FK_0d9d4e46c235e6c4815b35c8512" FOREIGN KEY ("bucketToken") REFERENCES "bucket_model"("bucketToken") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "file_upload_model" ADD CONSTRAINT "FK_029f07bda290e6cb26217394406" FOREIGN KEY ("bucketToken") REFERENCES "bucket_model"("bucketToken") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "file_upload_model" ADD CONSTRAINT "FK_1be00fe7085362efb712c4a97b5" FOREIGN KEY ("albumToken") REFERENCES "album_model"("albumToken") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "file_upload_model" DROP CONSTRAINT "FK_1be00fe7085362efb712c4a97b5"`);
        await queryRunner.query(`ALTER TABLE "file_upload_model" DROP CONSTRAINT "FK_029f07bda290e6cb26217394406"`);
        await queryRunner.query(`ALTER TABLE "album_model" DROP CONSTRAINT "FK_0d9d4e46c235e6c4815b35c8512"`);
        await queryRunner.query(`ALTER TABLE "thumbnail_cache_model" DROP CONSTRAINT "FK_cfe7839365243cdbaeeccbaf551"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c8524f9ddc7a24cbae2013fe97"`);
        await queryRunner.query(`DROP TABLE "file_upload_model"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d2d1f33e971f83bea806abd569"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8a2f2dde7072de099e6ae8b452"`);
        await queryRunner.query(`DROP TABLE "album_model"`);
        await queryRunner.query(`DROP TABLE "user_model"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_74d7bc76abfc080b96e42ddac7"`);
        await queryRunner.query(`DROP TABLE "bucket_model"`);
        await queryRunner.query(`DROP TABLE "thumbnail_cache_model"`);
        await queryRunner.query(`DROP TABLE "ip_black_list_model"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7992668fc9dea8e1e06c9f16d6"`);
        await queryRunner.query(`DROP TABLE "session_model"`);
        await queryRunner.query(`DROP TABLE "express_rate_limit_store_model"`);
    }

}
