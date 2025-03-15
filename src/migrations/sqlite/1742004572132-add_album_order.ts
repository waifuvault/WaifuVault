import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAlbumOrder1742002661653 implements MigrationInterface {
    name = 'AddAlbumOrder1742002661653'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add the new column
        await queryRunner.query(`ALTER TABLE "file_upload_model" ADD COLUMN "addedToAlbumOrder" NUMERIC`);

        // Get all albums with files
        const albums = await queryRunner.query(`
            SELECT DISTINCT "albumToken" FROM "file_upload_model" WHERE "albumToken" IS NOT NULL
        `);

        // For each album, update files with sequential order values
        for (const album of albums) {
            const albumToken = album.albumToken;

            // Get files for this album, ordered by creation date
            const files = await queryRunner.query(`
                SELECT "id" FROM "file_upload_model" 
                WHERE "albumToken" = '${albumToken}'
                ORDER BY "createdAt"
            `);

            // Update each file with its order value
            for (let i = 0; i < files.length; i++) {
                const orderValue = i + 1; // Start from 1
                await queryRunner.query(`
                    UPDATE "file_upload_model" 
                    SET "addedToAlbumOrder" = ${orderValue} 
                    WHERE "id" = ${files[i].id}
                `);
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "file_upload_model" DROP COLUMN "addedToAlbumOrder"`);
    }
}