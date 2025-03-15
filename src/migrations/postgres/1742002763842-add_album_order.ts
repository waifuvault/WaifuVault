import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAlbumOrder1742002661653 implements MigrationInterface {
    name = 'AddAlbumOrder1742002661653'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add the new column
        await queryRunner.query(`ALTER TABLE "file_upload_model" ADD "addedToAlbumOrder" numeric`);

        await queryRunner.query(`
            WITH ordered_files AS (
                SELECT id, "albumToken", ROW_NUMBER() OVER (PARTITION BY "albumToken" ORDER BY "createdAt") as row_num
                FROM file_upload_model
                WHERE "albumToken" IS NOT NULL
            )
            UPDATE file_upload_model
            SET "addedToAlbumOrder" = ordered_files.row_num
            FROM ordered_files
            WHERE file_upload_model.id = ordered_files.id
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "file_upload_model" DROP COLUMN "addedToAlbumOrder"`);
    }
}