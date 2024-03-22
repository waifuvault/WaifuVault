import {MigrationInterface, QueryRunner} from "typeorm";
import 'dotenv/config';
import process from "process";

export class ExpiresDataMigration1708275216281 implements MigrationInterface {
    name = 'ExpiresDataMigration1708275216281';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const MIN_EXPIRATION = 30 * 24 * 60 * 60 * 1000;
        const MAX_EXPIRATION = 365 * 24 * 60 * 60 * 1000;
        const FILE_SIZE_UPLOAD_LIMIT_MB = Number.parseInt(process.env.FILE_SIZE_UPLOAD_LIMIT_MB as string);

        const query_sql =
            `UPDATE file_upload_model
             SET expires = FLOOR((${MIN_EXPIRATION} - ${MAX_EXPIRATION}) *
                                 (POW(((CAST(fileSize AS REAL) / ${FILE_SIZE_UPLOAD_LIMIT_MB * 1048576}) - 1), 3)))
             WHERE id NOT IN (SELECT id FROM custom_row_ids)`;

        await queryRunner.query('CREATE TEMP TABLE IF NOT EXISTS custom_row_ids (id INTEGER PRIMARY KEY)');
        await queryRunner.query('INSERT INTO custom_row_ids(id) SELECT id FROM file_upload_model WHERE expires>0');
        // Update normal entries
        await queryRunner.query(query_sql);
        // Set minimums on normal entries
        await queryRunner.query(`UPDATE file_upload_model
                                 SET expires = ${MIN_EXPIRATION}
                                 WHERE expires < ${MIN_EXPIRATION}
                                   AND id NOT IN (SELECT id FROM custom_row_ids)`);
        // Update all entries from deltas to epochs
        await queryRunner.query('UPDATE file_upload_model SET expires = expires + (STRFTIME(\'%s\',createdAt)*1000)');
        // Cleanup temp table
        await queryRunner.query('DROP TABLE IF EXISTS custom_row_ids');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('UPDATE file_upload_model SET expires = 0');
    }

}
