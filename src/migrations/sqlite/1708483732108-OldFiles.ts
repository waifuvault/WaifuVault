import {MigrationInterface, QueryRunner} from "typeorm";
import {FileUtils} from "../../utils/Utils.js";

type fileNameResults = {
    id: number;
    fileName: string;
    fileExtension: string | null;
}

export class OldFiles1708483732108 implements MigrationInterface {
    private stripExtension(filename: string): string {
        const stripped = filename.split('.');
        stripped.pop();
        return stripped.join('.');
    }
    public async up(queryRunner: QueryRunner): Promise<void> {
        const entries = await queryRunner.query('SELECT id,fileName,fileExtension FROM file_upload_model WHERE fileExtension IS NULL') as fileNameResults[];
        const filenames = entries.map(entry => {
            return [entry.id, this.stripExtension(entry.fileName), FileUtils.getExtension(entry.fileName)];
        });
        const queryPArr = filenames
            .filter(v => v[2] !== '')
            .map(fileExtTuple => {
                return queryRunner.query(`UPDATE file_upload_model
                                          SET fileName = '${fileExtTuple[1]}',fileExtension = '${fileExtTuple[2]}'
                                          WHERE id = ${fileExtTuple[0]}`);
            });
        await Promise.all(queryPArr);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('UPDATE file_upload_model SET fileExtension = NULL');
    }

}
