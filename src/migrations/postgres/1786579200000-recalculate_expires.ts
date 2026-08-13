import { MigrationInterface, QueryRunner } from "typeorm";
import "dotenv/config";
import process from "process";

export class RecalculateExpires1786579200000 implements MigrationInterface {
    name = "RecalculateExpires1786579200000";

    private static readonly minExpiration = 30 * 24 * 60 * 60 * 1000;

    private static readonly maxExpiration = 365 * 24 * 60 * 60 * 1000;

    public async up(queryRunner: QueryRunner): Promise<void> {
        const { minExpiration, maxExpiration } = RecalculateExpires1786579200000;
        const delta = minExpiration - maxExpiration;
        const maxFileSizeBytes = RecalculateExpires1786579200000.getMaxFileSizeBytes();

        const createdAtMs = `(EXTRACT(EPOCH FROM "createdAt" AT TIME ZONE 'UTC') * 1000)`;
        const ttl = `GREATEST(FLOOR(${delta} * POWER((CAST("fileSize" AS DOUBLE PRECISION) / ${maxFileSizeBytes}) - 1, 3)), ${minExpiration})`;
        const predicate = `expires IS NOT NULL AND expires > ${createdAtMs} + ${ttl}`;

        const [{ count }] = await queryRunner.query(
            `SELECT COUNT(*) AS count FROM file_upload_model WHERE ${predicate}`,
        );
        console.log(`RecalculateExpires: shortening ${count} entries that outlive the retention their size allows`);

        await queryRunner.query(
            `UPDATE file_upload_model SET expires = ${createdAtMs} + ${ttl} WHERE ${predicate}`,
        );
    }

    public async down(): Promise<void> {
        throw new Error(
            "RecalculateExpires cannot be reverted: the original expiry values are not recoverable. Restore from a database backup instead.",
        );
    }

    private static getMaxFileSizeBytes(): number {
        const parsed = Number.parseInt(process.env.FILE_SIZE_UPLOAD_LIMIT_MB as string);
        const limitMb = Number.isNaN(parsed) ? 100 : parsed;
        return limitMb * 1048576;
    }
}
