import { MigrationInterface, QueryRunner } from "typeorm";
import * as crypto from "node:crypto";

export class HashIp1739304083954 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        type Entry = {
            ip: string,
            id: number,
        };
        // update files
        const fileEntries = await queryRunner.query(`SELECT id,ip FROM file_upload_model WHERE ip IS NOT NULL;`) as Entry[];
        await Promise.all(fileEntries.map(async entry => {
            const newValue = crypto.createHash("sha256").update(entry.ip).digest("hex");
            return queryRunner.query(`UPDATE file_upload_model
                                      SET ip = '${newValue}'
                                      WHERE id = ${entry.id};`);
        }));

        // update albums
        const bucketEntries = await queryRunner.query(`SELECT id,ip FROM bucket_model WHERE ip IS NOT NULL;`) as Entry[];
        await Promise.all(bucketEntries.map(async entry => {
            const newValue = crypto.createHash("sha256").update(entry.ip).digest("hex");
            return queryRunner.query(`UPDATE bucket_model
                                      SET ip = '${newValue}'
                                      WHERE id = ${entry.id};`);
        }));
    }

    public async down(_: QueryRunner): Promise<void> {
    }

}
