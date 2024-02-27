import {MigrationInterface, QueryRunner} from "typeorm";
import {MimeService} from "../services/MimeService.js";
import {filesDir} from "../utils/Utils.js";

type fileNameResults = {
    id: number;
    fileName: string;
    fileExtension: string | null;
}

export class MediaTypeData1708297065228 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const mimeService = new MimeService();
        const entries = await queryRunner.query('SELECT id,fileName,fileExtension FROM file_upload_model') as fileNameResults[];
        const filenames = entries.map(entry => {
            return [entry.id, entry.fileName + (entry.fileExtension ? `.${entry.fileExtension}` : '')];
        });
        const mediaTypesPArr = filenames.map(entry => {
            return Promise.all([
                entry[0],
                mimeService.findMimeType(`${filesDir}/${entry[1]}`)
            ]);
        });
        const mediaTypes = await Promise.all(mediaTypesPArr);
        const queryPArr = mediaTypes
            .filter(v => v[1] !== null)
            .map(mediaTypeTuple => {
                return queryRunner.query(`UPDATE file_upload_model
                                          SET mediaType = '${mediaTypeTuple[1]}'
                                          WHERE id = ${mediaTypeTuple[0]}`);
            });
        await Promise.all(queryPArr);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('UPDATE file_upload_model SET mediaType = NULL');
    }
}
