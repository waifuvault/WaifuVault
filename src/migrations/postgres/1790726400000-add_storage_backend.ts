import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStorageBackend1790726400000 implements MigrationInterface {
    name = "AddStorageBackend1790726400000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "file_upload_model" ADD "storageBackend" text NOT NULL DEFAULT 'local'`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "file_upload_model" DROP COLUMN "storageBackend"`);
    }
}
