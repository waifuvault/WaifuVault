import { MigrationInterface, QueryRunner } from "typeorm";

export class IndexUpgrades1754835863034 implements MigrationInterface {
    name = 'IndexUpgrades1754835863034'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_c704fb2e26d1aff77983880cd7" ON "bucket_model" ("ip", "type") `);
        await queryRunner.query(`CREATE INDEX "IDX_b97b3ce14eb123fd9bdd236522" ON "bucket_model" ("type") `);
        await queryRunner.query(`CREATE INDEX "IDX_452ade4d040a296c1a6da0ac49" ON "album_model" ("name") `);
        await queryRunner.query(`CREATE INDEX "IDX_0d9d4e46c235e6c4815b35c851" ON "album_model" ("bucketToken") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_3e0a4342ff6e3b370d28f26d7b" ON "album_model" ("publicToken") `);
        await queryRunner.query(`CREATE INDEX "IDX_175a241046e80822ce29f57d69" ON "file_upload_model" ("checksum", "expires") `);
        await queryRunner.query(`CREATE INDEX "IDX_200a5a6ff9bc15874c738ddc20" ON "file_upload_model" ("albumToken", "addedToAlbumOrder") `);
        await queryRunner.query(`CREATE INDEX "IDX_78eaa1bd51db9cd8e18639a3b7" ON "file_upload_model" ("bucketToken", "expires") `);
        await queryRunner.query(`CREATE INDEX "IDX_5138d0b3f72e17cbf4ec8748b1" ON "file_upload_model" ("fileName") `);
        await queryRunner.query(`CREATE INDEX "IDX_988e9784ced42e4d6d7ae210e2" ON "file_upload_model" ("ip") `);
        await queryRunner.query(`CREATE INDEX "IDX_1be00fe7085362efb712c4a97b" ON "file_upload_model" ("albumToken") `);
        await queryRunner.query(`CREATE INDEX "IDX_029f07bda290e6cb2621739440" ON "file_upload_model" ("bucketToken") `);
        await queryRunner.query(`CREATE INDEX "IDX_da669cdbaff166456dd1a1b611" ON "file_upload_model" ("expires") `);
        await queryRunner.query(`CREATE INDEX "IDX_eec34d49fff4ee286362cd838d" ON "file_upload_model" ("checksum") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_eec34d49fff4ee286362cd838d"`);
        await queryRunner.query(`DROP INDEX "IDX_da669cdbaff166456dd1a1b611"`);
        await queryRunner.query(`DROP INDEX "IDX_029f07bda290e6cb2621739440"`);
        await queryRunner.query(`DROP INDEX "IDX_1be00fe7085362efb712c4a97b"`);
        await queryRunner.query(`DROP INDEX "IDX_988e9784ced42e4d6d7ae210e2"`);
        await queryRunner.query(`DROP INDEX "IDX_5138d0b3f72e17cbf4ec8748b1"`);
        await queryRunner.query(`DROP INDEX "IDX_78eaa1bd51db9cd8e18639a3b7"`);
        await queryRunner.query(`DROP INDEX "IDX_200a5a6ff9bc15874c738ddc20"`);
        await queryRunner.query(`DROP INDEX "IDX_175a241046e80822ce29f57d69"`);
        await queryRunner.query(`DROP INDEX "IDX_3e0a4342ff6e3b370d28f26d7b"`);
        await queryRunner.query(`DROP INDEX "IDX_0d9d4e46c235e6c4815b35c851"`);
        await queryRunner.query(`DROP INDEX "IDX_452ade4d040a296c1a6da0ac49"`);
        await queryRunner.query(`DROP INDEX "IDX_b97b3ce14eb123fd9bdd236522"`);
        await queryRunner.query(`DROP INDEX "IDX_c704fb2e26d1aff77983880cd7"`);
    }

}
