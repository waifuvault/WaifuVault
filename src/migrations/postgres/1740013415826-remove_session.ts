import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveSession1740013415826 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "session_model"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "session_model" ("expiredAt" bigint NOT NULL, "id" character varying(255) NOT NULL, "json" text NOT NULL, "destroyedAt" TIMESTAMP, CONSTRAINT "PK_3c8671916fb700dcbc8128a8768" PRIMARY KEY ("id"))`);
    }

}
